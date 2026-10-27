import { DataSource } from 'typeorm';
import { prepararBaseDePrueba } from './base-datos';
import { Usuario } from '../../src/nucleo/entities/usuario.entity';
import { Negocio } from '../../src/nucleo/entities/negocio.entity';
import { Cliente } from '../../src/nucleo/entities/cliente.entity';
import { Servicio } from '../../src/nucleo/entities/servicio.entity';
import { Turno } from '../../src/nucleo/entities/turno.entity';
import { Canal, EstadoTurno, Plantilla } from '../../src/nucleo/entities/enums';

describe('Modelo de datos del núcleo', () => {
  let ds: DataSource;

  beforeAll(async () => {
    ds = await prepararBaseDePrueba();
  });

  afterAll(async () => {
    await ds.destroy();
  });

  it('CP-S2-04: las migraciones crean las entidades del núcleo', async () => {
    const filas: { table_name: string }[] = await ds.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const tablas = filas.map((f) => f.table_name);
    expect(tablas).toEqual(
      expect.arrayContaining([
        'usuario',
        'negocio',
        'cliente',
        'servicio',
        'turno',
      ]),
    );
  });

  it('CP-S2-05: rechaza un turno asociado a un cliente inexistente', async () => {
    const usuario = await ds
      .getRepository(Usuario)
      .save({ idIAM: 'iam-cp05', nombre: 'Dueño', correo: 'd@ejemplo.com' });
    const negocio = await ds.getRepository(Negocio).save({
      nombre: 'Consultorio',
      plantilla: Plantilla.ODONTOLOGIA,
      propietarioId: usuario.id,
    });
    const servicio = await ds.getRepository(Servicio).save({
      nombre: 'Consulta',
      duracionMin: 30,
      negocioId: negocio.id,
    });

    await expect(
      ds.getRepository(Turno).save({
        fecha: '2026-11-03',
        horaInicio: '10:00',
        horaFin: '10:30',
        estado: EstadoTurno.CONFIRMADO,
        canal: Canal.MANUAL,
        negocioId: negocio.id,
        clienteId: '00000000-0000-0000-0000-000000000000',
        servicioId: servicio.id,
      }),
    ).rejects.toMatchObject({ driverError: { code: '23503' } });

    expect(await ds.getRepository(Turno).count()).toBe(0);
  });

  it('RF-89: no permite dos clientes con el mismo teléfono en un negocio', async () => {
    const usuario = await ds
      .getRepository(Usuario)
      .save({ idIAM: 'iam-rf89', nombre: 'Dueño', correo: 'e@ejemplo.com' });
    const negocio = await ds.getRepository(Negocio).save({
      nombre: 'Nutrición',
      plantilla: Plantilla.NUTRICION,
      propietarioId: usuario.id,
    });
    const repo = ds.getRepository(Cliente);
    await repo.save({
      nombre: 'Ana',
      telefono: '+59899123456',
      negocioId: negocio.id,
    });

    await expect(
      repo.save({
        nombre: 'Otra',
        telefono: '+59899123456',
        negocioId: negocio.id,
      }),
    ).rejects.toMatchObject({ driverError: { code: '23505' } });
  });
});
