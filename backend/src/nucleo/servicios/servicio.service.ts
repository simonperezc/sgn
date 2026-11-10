import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not } from 'typeorm';
import { Negocio } from '../entities/negocio.entity';
import { Servicio } from '../entities/servicio.entity';
import { Turno } from '../entities/turno.entity';
import { EstadoTurno } from '../entities/enums';
import type {
  ErrorCampo,
  HorarioDisponible,
} from '../negocios/negocio.validacion';
import {
  ahoraEnUruguay,
  aHora,
  aMinutos,
  bloquearFechas,
  dentroDelHorario,
  Rango,
  seSuperponen,
} from '../agenda/disponibilidad';
import { validarDuracion, validarNombreServicio } from './servicio.validacion';

export type DatosServicio = Record<string, unknown>;

export interface ServicioVista {
  id: string;
  nombre: string;
  duracionMin: number;
}

function aVista(servicio: Servicio): ServicioVista {
  return {
    id: servicio.id,
    nombre: servicio.nombre,
    duracionMin: servicio.duracionMin,
  };
}

@Injectable()
export class ServicioService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Servicios que el negocio ofrece actualmente (RF-19). */
  async listar(negocioId: string): Promise<ServicioVista[]> {
    const servicios = await this.dataSource.getRepository(Servicio).find({
      where: { negocioId, activo: true },
      order: { nombre: 'ASC' },
    });
    return servicios.map(aVista);
  }

  async crear(negocioId: string, datos: DatosServicio): Promise<ServicioVista> {
    this.exigirValidos([
      validarNombreServicio(datos.nombre),
      validarDuracion(datos.duracionMin),
    ]);
    const repositorio = this.dataSource.getRepository(Servicio);
    const servicio = await repositorio.save(
      repositorio.create({
        negocioId,
        nombre: (datos.nombre as string).trim(),
        duracionMin: datos.duracionMin as number,
      }),
    );
    return aVista(servicio);
  }

  /**
   * Edita el servicio y refleja una nueva duración en sus reservas futuras no
   * confirmadas (CU 4, 4s). Si alguna dejaría de entrar en la agenda, rechaza
   * el cambio completo e informa cuáles son.
   */
  async actualizar(
    negocio: Negocio,
    servicioId: string,
    datos: DatosServicio,
  ): Promise<ServicioVista> {
    const errores: (ErrorCampo | null)[] = [];
    if ('nombre' in datos) {
      errores.push(validarNombreServicio(datos.nombre));
    }
    if ('duracionMin' in datos) {
      errores.push(validarDuracion(datos.duracionMin));
    }
    this.exigirValidos(errores);

    return this.dataSource.transaction(async (em) => {
      const servicio = await this.buscarActivo(em, negocio.id, servicioId);
      if ('nombre' in datos) {
        servicio.nombre = (datos.nombre as string).trim();
      }
      if ('duracionMin' in datos) {
        servicio.duracionMin = datos.duracionMin as number;
        await this.reflejarDuracion(em, negocio, servicio);
      }
      return aVista(await em.save(servicio));
    });
  }

  /** Baja lógica: deja de ofrecerse y el historial se conserva (CP-S3-24). */
  async eliminar(negocioId: string, servicioId: string): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      const servicio = await this.buscarActivo(em, negocioId, servicioId);
      servicio.activo = false;
      await em.save(servicio);
    });
  }

  private async buscarActivo(
    em: EntityManager,
    negocioId: string,
    servicioId: string,
  ): Promise<Servicio> {
    const servicio = await em.findOne(Servicio, {
      where: { id: servicioId, negocioId, activo: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!servicio) {
      throw new NotFoundException('El servicio no existe');
    }
    return servicio;
  }

  private async reflejarDuracion(
    em: EntityManager,
    negocio: Negocio,
    servicio: Servicio,
  ): Promise<void> {
    const ahora = ahoraEnUruguay();
    const pendientesFuturos = (turnos: Turno[]) =>
      turnos.filter(
        (turno) =>
          turno.fecha > ahora.fecha ||
          (turno.fecha === ahora.fecha &&
            turno.horaInicio.slice(0, 5) > ahora.hora),
      );
    const delServicio = () =>
      em.findBy(Turno, {
        negocioId: negocio.id,
        servicioId: servicio.id,
        estado: EstadoTurno.PENDIENTE_PAGO,
      });

    const fechas = pendientesFuturos(await delServicio()).map((t) => t.fecha);
    await bloquearFechas(em, negocio.id, fechas);
    // Se releen ya con la agenda bloqueada.
    const afectados = pendientesFuturos(await delServicio());
    if (afectados.length === 0) {
      return;
    }

    const nuevoRango = (turno: Turno): Rango => {
      const inicio = aMinutos(turno.horaInicio);
      return { inicio, fin: inicio + servicio.duracionMin };
    };
    const idsAfectados = new Set(afectados.map((t) => t.id));
    const horario = (negocio.horarioDisponible ?? {}) as HorarioDisponible;

    const conflictos: Turno[] = [];
    for (const turno of afectados) {
      const delDia = await em.findBy(Turno, {
        negocioId: negocio.id,
        fecha: turno.fecha,
        estado: Not(EstadoTurno.CANCELADO),
      });
      const rango = nuevoRango(turno);
      const choca = delDia.some(
        (otro) =>
          otro.id !== turno.id &&
          seSuperponen(
            rango,
            idsAfectados.has(otro.id)
              ? nuevoRango(otro)
              : {
                  inicio: aMinutos(otro.horaInicio),
                  fin: aMinutos(otro.horaFin),
                },
          ),
      );
      if (choca || !dentroDelHorario(horario, turno.fecha, rango)) {
        conflictos.push(turno);
      }
    }

    if (conflictos.length > 0) {
      throw new ConflictException({
        message:
          'Con esa duración hay reservas que no entran en la agenda. No se aplicó el cambio.',
        turnos: conflictos.map((turno) => ({
          fecha: turno.fecha,
          horaInicio: turno.horaInicio.slice(0, 5),
        })),
      });
    }

    for (const turno of afectados) {
      turno.horaFin = aHora(nuevoRango(turno).fin);
    }
    await em.save(afectados);
  }

  private exigirValidos(errores: (ErrorCampo | null)[]): void {
    const campos = errores.filter((error) => error !== null);
    if (campos.length > 0) {
      throw new BadRequestException({
        message: 'Revisá los datos del servicio',
        campos,
      });
    }
  }
}
