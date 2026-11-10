import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { Cliente } from '../../src/nucleo/entities/cliente.entity';
import { EstadoTurno, Plantilla } from '../../src/nucleo/entities/enums';
import { Negocio } from '../../src/nucleo/entities/negocio.entity';
import { Servicio } from '../../src/nucleo/entities/servicio.entity';
import { Turno } from '../../src/nucleo/entities/turno.entity';
import { Usuario } from '../../src/nucleo/entities/usuario.entity';
import { bloquearFechas } from '../../src/nucleo/agenda/disponibilidad';
import { firmarToken } from '../utils/tokens-cognito';
import { crearAppDePrueba } from './app-prueba';
import { prepararBaseDePrueba } from './base-datos';

// Lunes y martes lejanos, para que los turnos siempre sean futuros.
const LUNES = '2090-01-02';
const MARTES = '2090-01-03';
const HORARIO = {
  lunes: [{ inicio: '09:00', fin: '18:00' }],
  martes: [{ inicio: '09:00', fin: '18:00' }],
};
const IAM_A = 'aaaaaaaa-0000-4000-8000-0000000000a1';
const IAM_B = 'bbbbbbbb-0000-4000-8000-0000000000b1';
const TELEFONO_ANA = '+59899123456';

interface TurnoRespuesta {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
  cliente: { id: string; telefono: string };
  servicio: { id: string };
}

interface ConflictoRespuesta {
  message: string;
  sugerencias: string[];
}

interface ErrorRespuesta {
  campos: { campo: string }[];
}

describe('Agenda manual: turnos y clientes por teléfono (CU 5, CU 6)', () => {
  let ds: DataSource;
  let app: INestApplication<App>;
  let negocioA: Negocio;
  let negocioB: Negocio;
  let consulta: Servicio;
  let control: Servicio;
  let largo: Servicio;
  let servicioB: Servicio;
  let ana: Cliente;
  let clienteB: Cliente;

  const auth = (sub = IAM_A) => `Bearer ${firmarToken({ sub })}`;
  const api = () => request(app.getHttpServer());
  const turnos = (negocio = negocioA) => `/negocios/${negocio.id}/turnos`;

  function crear(
    datos: Record<string, unknown>,
    negocio = negocioA,
    sub = IAM_A,
  ) {
    return api()
      .post(turnos(negocio))
      .set('Authorization', auth(sub))
      .send({
        clienteId: negocio === negocioA ? ana.id : clienteB.id,
        servicioId: negocio === negocioA ? consulta.id : servicioB.id,
        fecha: LUNES,
        ...datos,
      });
  }

  async function crearOk(horaInicio: string, negocio = negocioA) {
    const respuesta = await crear({ horaInicio }, negocio).expect(201);
    return respuesta.body as TurnoRespuesta;
  }

  const contarTurnos = () => ds.getRepository(Turno).count();
  const leer = (id: string) => ds.getRepository(Turno).findOneByOrFail({ id });

  beforeAll(async () => {
    ds = await prepararBaseDePrueba();
    const [duenaA, duenoB] = await ds.getRepository(Usuario).save([
      { idIAM: IAM_A, nombre: 'Dueña A', correo: 'a@ejemplo.com' },
      { idIAM: IAM_B, nombre: 'Dueño B', correo: 'b@ejemplo.com' },
    ]);
    [negocioA, negocioB] = await ds.getRepository(Negocio).save([
      {
        nombre: 'A',
        horarioDisponible: HORARIO,
        plantilla: Plantilla.GENERICO,
        propietarioId: duenaA.id,
      },
      {
        nombre: 'B',
        horarioDisponible: HORARIO,
        plantilla: Plantilla.GENERICO,
        propietarioId: duenoB.id,
      },
    ]);
    [consulta, control, largo, servicioB] = await ds
      .getRepository(Servicio)
      .save([
        { nombre: 'Consulta', duracionMin: 30, negocioId: negocioA.id },
        { nombre: 'Control', duracionMin: 30, negocioId: negocioA.id },
        { nombre: 'Limpieza', duracionMin: 45, negocioId: negocioA.id },
        { nombre: 'Consulta B', duracionMin: 30, negocioId: negocioB.id },
      ]);
    [ana, clienteB] = await ds.getRepository(Cliente).save([
      { nombre: 'Ana', telefono: TELEFONO_ANA, negocioId: negocioA.id },
      { nombre: 'Beto', telefono: '+59898000000', negocioId: negocioB.id },
    ]);
    app = await crearAppDePrueba(ds);
  });

  afterAll(async () => {
    await app.close();
    await ds.destroy();
  });

  afterEach(async () => {
    await ds.query('DELETE FROM turno');
    await ds.query(
      `DELETE FROM cliente WHERE telefono NOT IN ($1, '+59898000000')`,
      [TELEFONO_ANA],
    );
  });

  it('CP-S3-26: crea el turno confirmado y lo muestra en la agenda del día', async () => {
    const creado = await crearOk('10:00');
    expect(creado).toMatchObject({
      horaInicio: '10:00',
      horaFin: '10:30',
      estado: EstadoTurno.CONFIRMADO,
    });

    const respuesta = await api()
      .get(`${turnos()}?fecha=${LUNES}`)
      .set('Authorization', auth())
      .expect(200);
    expect(
      (respuesta.body as TurnoRespuesta[]).map((turno) => turno.id),
    ).toEqual([creado.id]);
  });

  it('CP-S3-28: un horario ocupado se rechaza, sugiere horarios cercanos y no crea el turno', async () => {
    await crearOk('10:00');
    const antes = await contarTurnos();

    const respuesta = await crear({ horaInicio: '10:00' }).expect(409);

    const cuerpo = respuesta.body as ConflictoRespuesta;
    expect(cuerpo.message).toContain('ocupado');
    expect(cuerpo.sugerencias).toEqual(['09:15', '09:30', '10:30']);
    expect(await contarTurnos()).toBe(antes);
  });

  it('CP-S3-33: sin servicio indica el campo faltante y no crea el turno', async () => {
    const respuesta = await crear({
      horaInicio: '10:00',
      servicioId: undefined,
    }).expect(400);

    expect(
      (respuesta.body as ErrorRespuesta).campos.map((c) => c.campo),
    ).toEqual(['servicioId']);
    expect(await contarTurnos()).toBe(0);
  });

  it('rechaza una fecha y hora pasadas', async () => {
    await crear({ fecha: '2020-01-06', horaInicio: '10:00' }).expect(400);
  });

  it('CP-S3-34: la ocupación se calcula por negocio', async () => {
    await crearOk('10:00', negocioA);
    await crear({ horaInicio: '10:00' }, negocioB, IAM_B).expect(201);
  });

  it('CP-S3-35: editar fecha, horario y servicio actualiza el turno y libera el horario anterior', async () => {
    const turno = await crearOk('10:00');

    const respuesta = await api()
      .patch(`${turnos()}/${turno.id}`)
      .set('Authorization', auth())
      .send({ fecha: MARTES, horaInicio: '11:00', servicioId: largo.id })
      .expect(200);

    expect(respuesta.body).toMatchObject({
      fecha: MARTES,
      horaInicio: '11:00',
      horaFin: '11:45',
      servicio: { id: largo.id },
    });
    await crear({ horaInicio: '10:00' }).expect(201);
  });

  it('CP-S3-36: mover un turno a un horario ocupado se rechaza y conserva el original', async () => {
    const turnoA = await crearOk('10:00');
    await crearOk('11:00');

    await api()
      .patch(`${turnos()}/${turnoA.id}`)
      .set('Authorization', auth())
      .send({ horaInicio: '11:00' })
      .expect(409);

    expect((await leer(turnoA.id)).horaInicio).toBe('10:00:00');
  });

  it('CP-S3-37: cambiar el servicio por otro de igual duración no choca consigo mismo', async () => {
    const turno = await crearOk('10:00');

    await api()
      .patch(`${turnos()}/${turno.id}`)
      .set('Authorization', auth())
      .send({ servicioId: control.id })
      .expect(200);

    expect((await leer(turno.id)).servicioId).toBe(control.id);
  });

  it('CP-S3-38 / CP-S3-40: cancelar libera el horario y se puede volver a agendar', async () => {
    const turno = await crearOk('10:00');

    const respuesta = await api()
      .post(`${turnos()}/${turno.id}/cancelar`)
      .set('Authorization', auth())
      .expect(200);
    expect((respuesta.body as TurnoRespuesta).estado).toBe(
      EstadoTurno.CANCELADO,
    );

    await crear({ horaInicio: '10:00' }).expect(201);
    await api()
      .patch(`${turnos()}/${turno.id}`)
      .set('Authorization', auth())
      .send({ horaInicio: '12:00' })
      .expect(409);
  });

  it('CP-S3-41: otro negocio no puede editar ni cancelar el turno', async () => {
    const turno = await crearOk('10:00');

    // Con la ruta del negocio A: no es su dueño.
    await api()
      .patch(`${turnos()}/${turno.id}`)
      .set('Authorization', auth(IAM_B))
      .send({ horaInicio: '12:00' })
      .expect(403);
    // Con la ruta de su propio negocio: el turno no le pertenece.
    await api()
      .patch(`${turnos(negocioB)}/${turno.id}`)
      .set('Authorization', auth(IAM_B))
      .send({ horaInicio: '12:00' })
      .expect(404);
    await api()
      .post(`${turnos(negocioB)}/${turno.id}/cancelar`)
      .set('Authorization', auth(IAM_B))
      .expect(404);

    const guardado = await leer(turno.id);
    expect(guardado.horaInicio).toBe('10:00:00');
    expect(guardado.estado).toBe(EstadoTurno.CONFIRMADO);
  });

  it('altas simultáneas en el mismo horario: solo una se crea', async () => {
    const respuestas = await Promise.all(
      Array.from({ length: 8 }, () => crear({ horaInicio: '15:00' })),
    );

    const estados = respuestas.map((r) => r.status);
    expect(estados.filter((estado) => estado === 201)).toHaveLength(1);
    expect(estados.filter((estado) => estado === 409)).toHaveLength(7);
    expect(await contarTurnos()).toBe(1);
  });

  it('el alta espera a que termine otra operación sobre la agenda del mismo día', async () => {
    const otra = ds.createQueryRunner();
    await otra.connect();
    await otra.startTransaction();
    await bloquearFechas(otra.manager, negocioA.id, [LUNES]);

    let respondio = false;
    const pedido = crear({ horaInicio: '15:00' }).then((respuesta) => {
      respondio = true;
      return respuesta;
    });
    await new Promise((resolver) => setTimeout(resolver, 500));
    expect(respondio).toBe(false);

    await otra.commitTransaction();
    await otra.release();
    expect((await pedido).status).toBe(201);
  });

  it('CP-S3-53: encuentra al cliente por teléfono y le asocia el turno', async () => {
    const respuesta = await api()
      .get(`/negocios/${negocioA.id}/clientes`)
      .query({ telefono: '099 123 456' })
      .set('Authorization', auth())
      .expect(200);
    const [encontrado] = respuesta.body as { id: string }[];
    expect(encontrado.id).toBe(ana.id);

    const turno = await crearOk('10:00');
    expect(turno.cliente.id).toBe(ana.id);
  });

  it('un teléfono no registrado no devuelve clientes, y uno de otro negocio tampoco', async () => {
    for (const telefono of ['091 000 000', '098 000 000']) {
      const respuesta = await api()
        .get(`/negocios/${negocioA.id}/clientes`)
        .query({ telefono })
        .set('Authorization', auth())
        .expect(200);
      expect(respuesta.body).toEqual([]);
    }
  });

  it('CP-S3-54: crea el cliente en el momento y le asocia el turno', async () => {
    const respuesta = await crear({
      clienteId: undefined,
      clienteNuevo: { nombre: 'Bruno', telefono: '091 234 567' },
      horaInicio: '10:00',
    }).expect(201);

    const turno = respuesta.body as TurnoRespuesta;
    expect(turno.cliente.telefono).toBe('+59891234567');
    const cliente = await ds
      .getRepository(Cliente)
      .findOneByOrFail({ id: turno.cliente.id });
    expect(cliente).toMatchObject({ nombre: 'Bruno', negocioId: negocioA.id });
  });

  it('CP-S3-56: con un teléfono inválido no crea ni el cliente ni el turno', async () => {
    const clientesAntes = await ds.getRepository(Cliente).count();

    const respuesta = await crear({
      clienteId: undefined,
      clienteNuevo: { nombre: 'Bruno', telefono: '123' },
      horaInicio: '10:00',
    }).expect(400);

    expect((respuesta.body as ErrorRespuesta).campos[0].campo).toBe('telefono');
    expect(await ds.getRepository(Cliente).count()).toBe(clientesAntes);
    expect(await contarTurnos()).toBe(0);
  });

  it('si el horario está ocupado tampoco crea el cliente nuevo', async () => {
    await crearOk('10:00');
    const clientesAntes = await ds.getRepository(Cliente).count();

    await crear({
      clienteId: undefined,
      clienteNuevo: { nombre: 'Bruno', telefono: '091 234 567' },
      horaInicio: '10:00',
    }).expect(409);

    expect(await ds.getRepository(Cliente).count()).toBe(clientesAntes);
  });

  it('no crea un cliente nuevo con un teléfono ya registrado', async () => {
    await crear({
      clienteId: undefined,
      clienteNuevo: { nombre: 'Otra Ana', telefono: '+598 99 123 456' },
      horaInicio: '10:00',
    }).expect(400);
  });
});
