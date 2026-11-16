import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { Cliente } from '../../src/nucleo/entities/cliente.entity';
import { Canal, EstadoTurno, Plantilla } from '../../src/nucleo/entities/enums';
import { Negocio } from '../../src/nucleo/entities/negocio.entity';
import { Servicio } from '../../src/nucleo/entities/servicio.entity';
import { Turno } from '../../src/nucleo/entities/turno.entity';
import { Usuario } from '../../src/nucleo/entities/usuario.entity';
import { firmarToken } from '../utils/tokens-cognito';
import { crearAppDePrueba } from './app-prueba';
import { prepararBaseDePrueba } from './base-datos';

const IAM_A = 'aaaaaaaa-0000-4000-8000-0000000000c1';
const IAM_B = 'bbbbbbbb-0000-4000-8000-0000000000c2';

interface ClienteRespuesta {
  id: string;
  nombre: string;
  telefono: string;
  correo: string | null;
  notas: string | null;
}

interface FichaRespuesta extends ClienteRespuesta {
  historial: { fecha: string; servicio: string }[];
}

describe('Clientes del negocio (CU 11)', () => {
  let ds: DataSource;
  let app: INestApplication<App>;
  let negocioA: Negocio;
  let negocioB: Negocio;
  let servicio: Servicio;

  const auth = (sub = IAM_A) => `Bearer ${firmarToken({ sub })}`;
  const api = () => request(app.getHttpServer());
  const clientes = (negocio = negocioA) => `/negocios/${negocio.id}/clientes`;

  function registrar(
    datos: Record<string, unknown>,
    negocio = negocioA,
    sub = IAM_A,
  ) {
    return api()
      .post(clientes(negocio))
      .set('Authorization', auth(sub))
      .send(datos);
  }

  async function registrarOk(nombre: string, telefono: string) {
    const respuesta = await registrar({ nombre, telefono }).expect(201);
    return respuesta.body as ClienteRespuesta;
  }

  const contar = () => ds.getRepository(Cliente).count();

  beforeAll(async () => {
    ds = await prepararBaseDePrueba();
    const [duenaA, duenoB] = await ds.getRepository(Usuario).save([
      { idIAM: IAM_A, nombre: 'Dueña A', correo: 'a@ejemplo.com' },
      { idIAM: IAM_B, nombre: 'Dueño B', correo: 'b@ejemplo.com' },
    ]);
    [negocioA, negocioB] = await ds.getRepository(Negocio).save([
      {
        nombre: 'A',
        plantilla: Plantilla.GENERICO,
        propietarioId: duenaA.id,
      },
      {
        nombre: 'B',
        plantilla: Plantilla.GENERICO,
        propietarioId: duenoB.id,
      },
    ]);
    servicio = await ds
      .getRepository(Servicio)
      .save({ nombre: 'Consulta', duracionMin: 30, negocioId: negocioA.id });
    app = await crearAppDePrueba(ds);
  });

  afterAll(async () => {
    await app.close();
    await ds.destroy();
  });

  afterEach(async () => {
    await ds.query('DELETE FROM turno');
    await ds.query('DELETE FROM cliente');
  });

  it('CP-S3-42: registra el cliente con el teléfono normalizado y lo muestra en el listado', async () => {
    const cliente = await registrarOk('Ana', '099 123 456');
    expect(cliente.telefono).toBe('+59899123456');

    const respuesta = await api()
      .get(clientes())
      .set('Authorization', auth())
      .expect(200);
    expect((respuesta.body as ClienteRespuesta[]).map((c) => c.id)).toEqual([
      cliente.id,
    ]);
  });

  it('CP-S3-44 / CP-S3-45: un teléfono ya registrado (aunque esté escrito distinto) no crea un duplicado', async () => {
    const ana = await registrarOk('Ana', '+59899123456');

    const respuesta = await registrar({
      nombre: 'Otra',
      telefono: '099123456',
    }).expect(409);

    expect(respuesta.body).toMatchObject({
      clienteExistente: { id: ana.id, nombre: 'Ana' },
    });
    expect(await contar()).toBe(1);
  });

  it('CP-S3-46: el mismo teléfono se permite en otro negocio', async () => {
    await registrarOk('Ana', '099 123 456');

    await registrar(
      { nombre: 'Ana en B', telefono: '099 123 456' },
      negocioB,
      IAM_B,
    ).expect(201);
  });

  it('CP-S3-47: rechaza un teléfono inválido y no crea el cliente', async () => {
    await registrar({ nombre: 'Ana', telefono: 'abc123' }).expect(400);
    expect(await contar()).toBe(0);
  });

  it('CP-S3-48: la ficha muestra el historial de servicios del cliente', async () => {
    const ana = await registrarOk('Ana', '099 123 456');
    await ds.getRepository(Turno).save(
      ['2090-01-02', '2090-01-09'].map((fecha) => ({
        fecha,
        horaInicio: '10:00',
        horaFin: '10:30',
        estado: EstadoTurno.CONFIRMADO,
        canal: Canal.MANUAL,
        negocioId: negocioA.id,
        clienteId: ana.id,
        servicioId: servicio.id,
      })),
    );

    const respuesta = await api()
      .get(`${clientes()}/${ana.id}`)
      .set('Authorization', auth())
      .expect(200);

    expect((respuesta.body as FichaRespuesta).historial).toMatchObject([
      { fecha: '2090-01-09', servicio: 'Consulta' },
      { fecha: '2090-01-02', servicio: 'Consulta' },
    ]);
  });

  it('CP-S3-49: un cliente sin turnos tiene el historial vacío', async () => {
    const ana = await registrarOk('Ana', '099 123 456');

    const respuesta = await api()
      .get(`${clientes()}/${ana.id}`)
      .set('Authorization', auth())
      .expect(200);

    expect((respuesta.body as FichaRespuesta).historial).toEqual([]);
  });

  it('CP-S3-50: guarda la nota y los datos de contacto', async () => {
    const ana = await registrarOk('Ana', '099 123 456');

    const respuesta = await api()
      .patch(`${clientes()}/${ana.id}`)
      .set('Authorization', auth())
      .send({ notas: 'Prefiere la tarde', correo: 'ana@ejemplo.com' })
      .expect(200);

    expect(respuesta.body).toMatchObject({
      notas: 'Prefiere la tarde',
      correo: 'ana@ejemplo.com',
    });
  });

  it('CP-S3-51: cambiar el teléfono por el de otro cliente se rechaza y conserva el original', async () => {
    const ana = await registrarOk('Ana', '099 123 456');
    await registrarOk('Beto', '098 000 000');

    await api()
      .patch(`${clientes()}/${ana.id}`)
      .set('Authorization', auth())
      .send({ telefono: '098 000 000' })
      .expect(409);

    const guardada = await ds
      .getRepository(Cliente)
      .findOneByOrFail({ id: ana.id });
    expect(guardada.telefono).toBe('+59899123456');
  });

  it('CP-S3-52: otro negocio no obtiene la ficha del cliente', async () => {
    const ana = await registrarOk('Ana', '099 123 456');

    // Con la ruta del negocio A: no es su dueño.
    const ajena = await api()
      .get(`${clientes()}/${ana.id}`)
      .set('Authorization', auth(IAM_B))
      .expect(403);
    // Con la ruta de su propio negocio: el cliente no le pertenece.
    const propia = await api()
      .get(`${clientes(negocioB)}/${ana.id}`)
      .set('Authorization', auth(IAM_B))
      .expect(404);

    for (const respuesta of [ajena, propia]) {
      expect(JSON.stringify(respuesta.body)).not.toContain('Ana');
      expect(JSON.stringify(respuesta.body)).not.toContain('59899123456');
    }
  });
});
