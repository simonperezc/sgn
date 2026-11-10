import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { Cliente } from '../../src/nucleo/entities/cliente.entity';
import { Canal, EstadoTurno, Plantilla } from '../../src/nucleo/entities/enums';
import { NegocioFoto } from '../../src/nucleo/entities/negocio-foto.entity';
import { Negocio } from '../../src/nucleo/entities/negocio.entity';
import { Servicio } from '../../src/nucleo/entities/servicio.entity';
import { Turno } from '../../src/nucleo/entities/turno.entity';
import { Usuario } from '../../src/nucleo/entities/usuario.entity';
import { firmarToken } from '../utils/tokens-cognito';
import { crearAppDePrueba } from './app-prueba';
import { prepararBaseDePrueba } from './base-datos';

// Lunes lejano, para que los turnos siempre sean futuros.
const LUNES = '2090-01-02';
const HORARIO = { lunes: [{ inicio: '09:00', fin: '13:00' }] };
const IAM_A = 'aaaaaaaa-0000-4000-8000-00000000000a';
const IAM_B = 'bbbbbbbb-0000-4000-8000-00000000000b';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

interface ServicioRespuesta {
  id: string;
  nombre: string;
  duracionMin: number;
}

describe('Datos del negocio y servicios (CU 4)', () => {
  let ds: DataSource;
  let app: INestApplication<App>;
  let negocio: Negocio;
  let cliente: Cliente;
  const auth = (sub = IAM_A) => `Bearer ${firmarToken({ sub })}`;
  const api = () => request(app.getHttpServer());
  const rutaServicios = () => `/negocios/${negocio.id}/servicios`;

  async function crearServicio(duracionMin = 30): Promise<ServicioRespuesta> {
    const respuesta = await api()
      .post(rutaServicios())
      .set('Authorization', auth())
      .send({ nombre: 'Consulta', duracionMin })
      .expect(201);
    return respuesta.body as ServicioRespuesta;
  }

  function crearTurno(
    servicioId: string,
    horaInicio: string,
    horaFin: string,
    estado = EstadoTurno.PENDIENTE_PAGO,
  ): Promise<Turno> {
    return ds.getRepository(Turno).save({
      fecha: LUNES,
      horaInicio,
      horaFin,
      estado,
      canal: Canal.WEB,
      negocioId: negocio.id,
      clienteId: cliente.id,
      servicioId,
    });
  }

  const turno = (id: string) => ds.getRepository(Turno).findOneByOrFail({ id });

  beforeAll(async () => {
    ds = await prepararBaseDePrueba();
    const [duena] = await ds.getRepository(Usuario).save([
      { idIAM: IAM_A, nombre: 'Dueña', correo: 'a@ejemplo.com' },
      { idIAM: IAM_B, nombre: 'Otro', correo: 'b@ejemplo.com' },
    ]);
    negocio = await ds.getRepository(Negocio).save({
      nombre: 'Clínica',
      horarioDisponible: HORARIO,
      plantilla: Plantilla.GENERICO,
      propietarioId: duena.id,
    });
    cliente = await ds.getRepository(Cliente).save({
      nombre: 'Ana',
      telefono: '+59899123456',
      negocioId: negocio.id,
    });
    app = await crearAppDePrueba(ds);
  });

  afterAll(async () => {
    await app.close();
    await ds.destroy();
  });

  afterEach(async () => {
    await ds.query('DELETE FROM turno');
  });

  it('guarda dirección, contacto y horario', async () => {
    const horario = { martes: [{ inicio: '10:00', fin: '12:00' }] };
    await api()
      .patch(`/negocios/${negocio.id}`)
      .set('Authorization', auth())
      .send({
        direccion: 'Av. Italia 1234',
        contacto: '099 000 000',
        horarioDisponible: horario,
      })
      .expect(200);

    const guardado = await ds
      .getRepository(Negocio)
      .findOneByOrFail({ id: negocio.id });
    expect(guardado).toMatchObject({
      direccion: 'Av. Italia 1234',
      horarioDisponible: horario,
    });
    await ds
      .getRepository(Negocio)
      .update({ id: negocio.id }, { horarioDisponible: HORARIO });
  });

  it('no modifica el horario guardado si el nuevo es inválido', async () => {
    await api()
      .patch(`/negocios/${negocio.id}`)
      .set('Authorization', auth())
      .send({
        horarioDisponible: { lunes: [{ inicio: '18:00', fin: '09:00' }] },
      })
      .expect(400);

    const guardado = await ds
      .getRepository(Negocio)
      .findOneByOrFail({ id: negocio.id });
    expect(guardado.horarioDisponible).toEqual(HORARIO);
  });

  it('guarda una imagen, la devuelve, y un archivo que no es imagen conserva la foto anterior', async () => {
    const subir = (contenido: Buffer) =>
      api()
        .put(`/negocios/${negocio.id}/foto`)
        .set('Authorization', auth())
        .attach('foto', contenido, {
          filename: 'foto.png',
          contentType: 'image/png',
        });

    await subir(PNG).expect(204);
    await subir(Buffer.from('esto no es una imagen')).expect(400);

    const foto = await ds
      .getRepository(NegocioFoto)
      .findOneByOrFail({ negocioId: negocio.id });
    expect(Buffer.compare(foto.datos, PNG)).toBe(0);

    const respuesta = await api()
      .get(`/negocios/${negocio.id}/foto`)
      .set('Authorization', auth())
      .expect(200)
      .expect('Content-Type', /image\/png/);
    expect(respuesta.headers['x-content-type-options']).toBe('nosniff');
  });

  it('rechaza una foto de más de 1 MB', async () => {
    const grande = Buffer.concat([PNG, Buffer.alloc(1024 * 1024)]);

    await api()
      .put(`/negocios/${negocio.id}/foto`)
      .set('Authorization', auth())
      .attach('foto', grande, 'foto.png')
      .expect(413);
  });

  it('CP-S3-20 / CP-S3-21: indica el campo faltante y no guarda el servicio', async () => {
    const antes = await ds.getRepository(Servicio).count();

    await api()
      .post(rutaServicios())
      .set('Authorization', auth())
      .send({ duracionMin: 30 })
      .expect(400);
    await api()
      .post(rutaServicios())
      .set('Authorization', auth())
      .send({ nombre: 'Consulta' })
      .expect(400);

    expect(await ds.getRepository(Servicio).count()).toBe(antes);
  });

  it('CP-S3-23: una nueva duración se refleja en las reservas futuras no confirmadas, y no en las confirmadas', async () => {
    const servicio = await crearServicio(30);
    const pendiente = await crearTurno(servicio.id, '09:00', '09:30');
    const confirmado = await crearTurno(
      servicio.id,
      '11:00',
      '11:30',
      EstadoTurno.CONFIRMADO,
    );

    await api()
      .patch(`${rutaServicios()}/${servicio.id}`)
      .set('Authorization', auth())
      .send({ duracionMin: 45 })
      .expect(200);

    expect((await turno(pendiente.id)).horaFin).toBe('09:45:00');
    expect((await turno(confirmado.id)).horaFin).toBe('11:30:00');
  });

  it('rechaza una duración que haría chocar una reserva y no aplica nada', async () => {
    const servicio = await crearServicio(30);
    const pendiente = await crearTurno(servicio.id, '09:00', '09:30');
    await crearTurno(servicio.id, '09:30', '10:00', EstadoTurno.CONFIRMADO);

    const respuesta = await api()
      .patch(`${rutaServicios()}/${servicio.id}`)
      .set('Authorization', auth())
      .send({ duracionMin: 45 })
      .expect(409);

    expect((respuesta.body as { turnos: unknown[] }).turnos).toEqual([
      { fecha: LUNES, horaInicio: '09:00' },
    ]);
    expect((await turno(pendiente.id)).horaFin).toBe('09:30:00');
    const guardado = await ds
      .getRepository(Servicio)
      .findOneByOrFail({ id: servicio.id });
    expect(guardado.duracionMin).toBe(30);
  });

  it('rechaza una duración que saca una reserva del horario de atención', async () => {
    const servicio = await crearServicio(30);
    await crearTurno(servicio.id, '12:30', '13:00');

    await api()
      .patch(`${rutaServicios()}/${servicio.id}`)
      .set('Authorization', auth())
      .send({ duracionMin: 60 })
      .expect(409);
  });

  it('CP-S3-24: el servicio eliminado deja de ofrecerse y su turno se conserva', async () => {
    const servicio = await crearServicio(30);
    const existente = await crearTurno(
      servicio.id,
      '09:00',
      '09:30',
      EstadoTurno.CONFIRMADO,
    );

    await api()
      .delete(`${rutaServicios()}/${servicio.id}`)
      .set('Authorization', auth())
      .expect(204);

    const respuesta = await api()
      .get(rutaServicios())
      .set('Authorization', auth())
      .expect(200);
    expect(
      (respuesta.body as ServicioRespuesta[]).map((s) => s.id),
    ).not.toContain(servicio.id);
    expect(await turno(existente.id)).toBeDefined();
  });

  it('un usuario ajeno no accede a los servicios del negocio', async () => {
    const servicio = await crearServicio(30);

    await api()
      .get(rutaServicios())
      .set('Authorization', auth(IAM_B))
      .expect(403);
    await api()
      .delete(`${rutaServicios()}/${servicio.id}`)
      .set('Authorization', auth(IAM_B))
      .expect(403);
  });
});
