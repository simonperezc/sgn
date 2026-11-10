import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { prepararBaseDePrueba } from './base-datos';
import { Negocio } from '../../src/nucleo/entities/negocio.entity';
import { Plantilla } from '../../src/nucleo/entities/enums';
import { Usuario } from '../../src/nucleo/entities/usuario.entity';
import { firmarToken } from '../utils/tokens-cognito';
import { crearAppDePrueba } from './app-prueba';

interface NegocioRespuesta {
  id: string;
  nombre: string;
  plantilla: string;
  paneles: string[];
}

interface ErrorRespuesta {
  campos: { campo: string }[];
}

const HORARIO = { lunes: [{ inicio: '09:00', fin: '18:00' }] };

describe('Alta y acceso a negocios por HTTP (CU 1, RF-15, RF-22, RNF-7)', () => {
  let ds: DataSource;
  let app: INestApplication<App>;
  const IAM_A = 'aaaaaaaa-0000-4000-8000-000000000001';
  const IAM_B = 'bbbbbbbb-0000-4000-8000-000000000002';

  const token = (sub: string) => `Bearer ${firmarToken({ sub })}`;
  const crearNegocio = (sub: string, plantilla: Plantilla, nombre = 'Local') =>
    request(app.getHttpServer())
      .post('/negocios')
      .set('Authorization', token(sub))
      .send({ nombre, horarioDisponible: HORARIO, plantilla });

  beforeAll(async () => {
    ds = await prepararBaseDePrueba();
    await ds.getRepository(Usuario).save([
      { idIAM: IAM_A, nombre: 'Dueña A', correo: 'a@ejemplo.com' },
      { idIAM: IAM_B, nombre: 'Dueño B', correo: 'b@ejemplo.com' },
    ]);

    app = await crearAppDePrueba(ds);
  });

  afterAll(async () => {
    await app.close();
    await ds.destroy();
  });

  it('crea el negocio asociado al usuario, con los paneles de su plantilla', async () => {
    const respuesta = await crearNegocio(IAM_A, Plantilla.ODONTOLOGIA).expect(
      201,
    );

    expect(respuesta.body).toMatchObject({
      plantilla: Plantilla.ODONTOLOGIA,
      horarioDisponible: HORARIO,
    });
    expect((respuesta.body as NegocioRespuesta).paneles).toContain(
      'tratamientos',
    );
  });

  it('CP-S3-08: sin plantilla no crea el negocio', async () => {
    const antes = await ds.getRepository(Negocio).count();

    const respuesta = await request(app.getHttpServer())
      .post('/negocios')
      .set('Authorization', token(IAM_A))
      .send({ nombre: 'Sin plantilla', horarioDisponible: HORARIO })
      .expect(400);

    expect((respuesta.body as ErrorRespuesta).campos[0].campo).toBe(
      'plantilla',
    );
    expect(await ds.getRepository(Negocio).count()).toBe(antes);
  });

  it('informa los campos faltantes y no crea el negocio', async () => {
    const antes = await ds.getRepository(Negocio).count();

    const respuesta = await request(app.getHttpServer())
      .post('/negocios')
      .set('Authorization', token(IAM_A))
      .send({ plantilla: Plantilla.GENERICO })
      .expect(400);

    expect(
      (respuesta.body as ErrorRespuesta).campos.map((c) => c.campo),
    ).toEqual(['nombre', 'horarioDisponible']);
    expect(await ds.getRepository(Negocio).count()).toBe(antes);
  });

  it('CP-S3-09: rechaza cambiar la plantilla y el negocio la conserva', async () => {
    const body = (await crearNegocio(IAM_A, Plantilla.ODONTOLOGIA))
      .body as NegocioRespuesta;

    await request(app.getHttpServer())
      .patch(`/negocios/${body.id}`)
      .set('Authorization', token(IAM_A))
      .send({ plantilla: Plantilla.NUTRICION })
      .expect(400);

    const guardado = await ds
      .getRepository(Negocio)
      .findOneByOrFail({ id: body.id });
    expect(guardado.plantilla).toBe(Plantilla.ODONTOLOGIA);
  });

  it('CP-S3-10: un usuario puede tener varios negocios, cada uno con su plantilla', async () => {
    await crearNegocio(IAM_B, Plantilla.GENERICO, 'Primero');
    await crearNegocio(IAM_B, Plantilla.NUTRICION, 'Segundo');

    const respuesta = await request(app.getHttpServer())
      .get('/negocios')
      .set('Authorization', token(IAM_B))
      .expect(200);

    expect(
      (respuesta.body as NegocioRespuesta[]).map((n) => [
        n.nombre,
        n.plantilla,
      ]),
    ).toEqual([
      ['Primero', Plantilla.GENERICO],
      ['Segundo', Plantilla.NUTRICION],
    ]);
  });

  it('CP-S3-14: un negocio genérico no accede a los recursos de odontología', async () => {
    const body = (await crearNegocio(IAM_A, Plantilla.GENERICO))
      .body as NegocioRespuesta;

    await request(app.getHttpServer())
      .get(`/negocios/${body.id}/odontologia/tratamientos`)
      .set('Authorization', token(IAM_A))
      .expect(403);
  });

  it('un negocio de odontología sí accede a su módulo', async () => {
    const body = (await crearNegocio(IAM_A, Plantilla.ODONTOLOGIA))
      .body as NegocioRespuesta;

    await request(app.getHttpServer())
      .get(`/negocios/${body.id}/odontologia/tratamientos`)
      .set('Authorization', token(IAM_A))
      .expect(200);
  });

  it('CP-S3-25: un usuario ajeno no puede editar el negocio', async () => {
    const body = (await crearNegocio(IAM_A, Plantilla.GENERICO, 'Original'))
      .body as NegocioRespuesta;

    await request(app.getHttpServer())
      .patch(`/negocios/${body.id}`)
      .set('Authorization', token(IAM_B))
      .send({ nombre: 'Hackeado' })
      .expect(403);

    const guardado = await ds
      .getRepository(Negocio)
      .findOneByOrFail({ id: body.id });
    expect(guardado.nombre).toBe('Original');
  });

  it('rechaza sin token, y responde 404 ante un negocio inexistente', async () => {
    await request(app.getHttpServer()).get('/negocios').expect(401);
    await request(app.getHttpServer())
      .get('/negocios/no-es-un-uuid')
      .set('Authorization', token(IAM_A))
      .expect(404);
  });
});
