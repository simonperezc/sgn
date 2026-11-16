import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { aHora } from '../../src/nucleo/agenda/disponibilidad';
import { Cliente } from '../../src/nucleo/entities/cliente.entity';
import { Canal, EstadoTurno, Plantilla } from '../../src/nucleo/entities/enums';
import { Negocio } from '../../src/nucleo/entities/negocio.entity';
import { Servicio } from '../../src/nucleo/entities/servicio.entity';
import { Turno } from '../../src/nucleo/entities/turno.entity';
import { Usuario } from '../../src/nucleo/entities/usuario.entity';
import { firmarToken } from '../utils/tokens-cognito';
import { crearAppDePrueba } from './app-prueba';
import { prepararBaseDePrueba } from './base-datos';

// Lunes lejano, para que los turnos siempre sean futuros.
const LUNES = '2090-01-02';
const IAM = 'aaaaaaaa-0000-4000-8000-0000000000d1';
const CANTIDAD = 100;
const DURACION = 10;
const LIMITE_MS = 2000;

describe('Rendimiento de la validación de disponibilidad (RNF-22)', () => {
  let ds: DataSource;
  let app: INestApplication<App>;
  let negocio: Negocio;
  let servicio: Servicio;
  let cliente: Cliente;

  /** Pide un turno y devuelve el estado HTTP y lo que tardó la respuesta. */
  async function pedirTurno(horaInicio: string) {
    const inicio = performance.now();
    const respuesta = await request(app.getHttpServer())
      .post(`/negocios/${negocio.id}/turnos`)
      .set('Authorization', `Bearer ${firmarToken({ sub: IAM })}`)
      .send({
        clienteId: cliente.id,
        servicioId: servicio.id,
        fecha: LUNES,
        horaInicio,
      });
    return { estado: respuesta.status, ms: performance.now() - inicio };
  }

  beforeAll(async () => {
    ds = await prepararBaseDePrueba();
    const duena = await ds
      .getRepository(Usuario)
      .save({ idIAM: IAM, nombre: 'Dueña', correo: 'd@ejemplo.com' });
    negocio = await ds.getRepository(Negocio).save({
      nombre: 'Agenda llena',
      horarioDisponible: { lunes: [{ inicio: '00:00', fin: '23:59' }] },
      plantilla: Plantilla.GENERICO,
      propietarioId: duena.id,
    });
    servicio = await ds.getRepository(Servicio).save({
      nombre: 'Control',
      duracionMin: DURACION,
      negocioId: negocio.id,
    });
    cliente = await ds.getRepository(Cliente).save({
      nombre: 'Ana',
      telefono: '+59899123456',
      negocioId: negocio.id,
    });
    // 100 turnos seguidos de 10 minutos: de 00:00 a 16:40.
    await ds.getRepository(Turno).save(
      Array.from({ length: CANTIDAD }, (_, i) => ({
        fecha: LUNES,
        horaInicio: aHora(i * DURACION),
        horaFin: aHora((i + 1) * DURACION),
        estado: EstadoTurno.CONFIRMADO,
        canal: Canal.MANUAL,
        negocioId: negocio.id,
        clienteId: cliente.id,
        servicioId: servicio.id,
      })),
    );
    app = await crearAppDePrueba(ds);
  });

  afterAll(async () => {
    await app.close();
    await ds.destroy();
  });

  it('CP-S3-58: con 100 turnos en la fecha, valida la disponibilidad en menos de 2 segundos', async () => {
    expect(
      await ds
        .getRepository(Turno)
        .countBy({ negocioId: negocio.id, fecha: LUNES }),
    ).toBe(CANTIDAD);

    // Horario ocupado: valida contra los 100 turnos y calcula sugerencias.
    const ocupado = await pedirTurno('08:00');
    expect(ocupado.estado).toBe(409);
    expect(ocupado.ms).toBeLessThan(LIMITE_MS);

    // Horario libre: valida contra los 100 turnos y crea el turno.
    const libre = await pedirTurno('17:00');
    expect(libre.estado).toBe(201);
    expect(libre.ms).toBeLessThan(LIMITE_MS);
  });
});
