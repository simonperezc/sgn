import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, QueryFailedError } from 'typeorm';
import { Cliente } from '../entities/cliente.entity';
import { Canal, EstadoTurno } from '../entities/enums';
import { Negocio } from '../entities/negocio.entity';
import { Servicio } from '../entities/servicio.entity';
import { Turno } from '../entities/turno.entity';
import {
  ahoraEnUruguay,
  aHora,
  aMinutos,
  bloquearFechas,
} from '../agenda/disponibilidad';
import {
  MENSAJE_TELEFONO_INVALIDO,
  normalizarTelefono,
} from '../clientes/telefono';
import type {
  ErrorCampo,
  HorarioDisponible,
} from '../negocios/negocio.validacion';
import {
  motivoNoDisponible,
  Ocupado,
  rangoDelTurno,
  sugerirHorarios,
  validarFecha,
  validarHora,
} from './turno.validacion';

export type DatosTurno = Record<string, unknown>;

export interface TurnoVista {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: EstadoTurno;
  canal: Canal;
  notaCliente: string | null;
  cliente: { id: string; nombre: string; telefono: string };
  servicio: { id: string; nombre: string; duracionMin: number };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NOTA = 500;

function aVista(turno: Turno): TurnoVista {
  return {
    id: turno.id,
    fecha: turno.fecha,
    horaInicio: turno.horaInicio.slice(0, 5),
    horaFin: turno.horaFin.slice(0, 5),
    estado: turno.estado,
    canal: turno.canal,
    notaCliente: turno.notaCliente,
    cliente: {
      id: turno.cliente.id,
      nombre: turno.cliente.nombre,
      telefono: turno.cliente.telefono,
    },
    servicio: {
      id: turno.servicio.id,
      nombre: turno.servicio.nombre,
      duracionMin: turno.servicio.duracionMin,
    },
  };
}

function invalido(campos: ErrorCampo[]): BadRequestException {
  return new BadRequestException({
    message: 'Revisá los datos del turno',
    campos,
  });
}

function exigirValidos(errores: (ErrorCampo | null)[]): void {
  const campos = errores.filter((error) => error !== null);
  if (campos.length > 0) {
    throw invalido(campos);
  }
}

function validarServicioId(valor: unknown): ErrorCampo | null {
  return typeof valor === 'string' && UUID.test(valor)
    ? null
    : { campo: 'servicioId', mensaje: 'Elegí el servicio del turno' };
}

function validarNota(valor: unknown): ErrorCampo | null {
  if (valor === undefined || valor === null) {
    return null;
  }
  return typeof valor === 'string' && valor.length <= MAX_NOTA
    ? null
    : {
        campo: 'notaCliente',
        mensaje: `La nota no puede superar los ${MAX_NOTA} caracteres`,
      };
}

/** Cliente existente (clienteId) o creado en el momento (clienteNuevo, RF-91). */
type ClienteElegido =
  { id: string } | { nuevo: { nombre: string; telefono: string } };

function leerCliente(datos: DatosTurno): {
  cliente?: ClienteElegido;
  errores: ErrorCampo[];
} {
  const nuevo = datos.clienteNuevo;
  if (typeof nuevo === 'object' && nuevo !== null) {
    const { nombre, telefono } = nuevo as Record<string, unknown>;
    const errores: ErrorCampo[] = [];
    if (typeof nombre !== 'string' || nombre.trim() === '') {
      errores.push({
        campo: 'clienteNombre',
        mensaje: 'Ingresá el nombre del cliente',
      });
    }
    const normalizado = normalizarTelefono(telefono);
    if (!normalizado) {
      errores.push({ campo: 'telefono', mensaje: MENSAJE_TELEFONO_INVALIDO });
    }
    return errores.length > 0
      ? { errores }
      : {
          cliente: {
            nuevo: {
              nombre: (nombre as string).trim(),
              telefono: normalizado as string,
            },
          },
          errores,
        };
  }
  if (typeof datos.clienteId === 'string' && UUID.test(datos.clienteId)) {
    return { cliente: { id: datos.clienteId }, errores: [] };
  }
  return {
    errores: [{ campo: 'cliente', mensaje: 'Elegí el cliente del turno' }],
  };
}

function exigirFuturo(fecha: string, horaInicio: string): void {
  const ahora = ahoraEnUruguay();
  if (
    fecha < ahora.fecha ||
    (fecha === ahora.fecha && horaInicio <= ahora.hora)
  ) {
    throw invalido([
      { campo: 'horaInicio', mensaje: 'Elegí una fecha y hora futuras' },
    ]);
  }
}

@Injectable()
export class TurnoService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Agenda de un día del negocio, incluidos los cancelados. */
  async listar(negocioId: string, fecha: unknown): Promise<TurnoVista[]> {
    exigirValidos([validarFecha(fecha)]);
    const turnos = await this.dataSource.getRepository(Turno).find({
      where: { negocioId, fecha: fecha as string },
      relations: { cliente: true, servicio: true },
      order: { horaInicio: 'ASC' },
    });
    return turnos.map(aVista);
  }

  /** Alta manual (CU 5, RF-24): el turno queda confirmado. */
  async crear(negocio: Negocio, datos: DatosTurno): Promise<TurnoVista> {
    const { cliente, errores } = leerCliente(datos);
    exigirValidos([
      ...errores,
      validarServicioId(datos.servicioId),
      validarFecha(datos.fecha),
      validarHora(datos.horaInicio),
      validarNota(datos.notaCliente),
    ]);
    const fecha = datos.fecha as string;
    const horaInicio = datos.horaInicio as string;
    exigirFuturo(fecha, horaInicio);

    const id = await this.dataSource.transaction(async (em) => {
      const servicio = await this.servicioActivo(
        em,
        negocio.id,
        datos.servicioId as string,
      );
      const clienteId = await this.resolverCliente(
        em,
        negocio.id,
        cliente as ClienteElegido,
        async () => {
          await bloquearFechas(em, negocio.id, [fecha]);
          await this.exigirDisponible(
            em,
            negocio,
            fecha,
            horaInicio,
            servicio.duracionMin,
          );
        },
      );

      const turno = await em.save(
        em.create(Turno, {
          negocioId: negocio.id,
          clienteId,
          servicioId: servicio.id,
          fecha,
          horaInicio,
          horaFin: aHora(rangoDelTurno(horaInicio, servicio.duracionMin).fin),
          estado: EstadoTurno.CONFIRMADO,
          canal: Canal.MANUAL,
          notaCliente: textoOpcional(datos.notaCliente),
        }),
      );
      return turno.id;
    });
    return this.vista(id);
  }

  /** Edición de fecha, horario, servicio o nota (CU 6, RF-25). */
  async actualizar(
    negocio: Negocio,
    turnoId: string,
    datos: DatosTurno,
  ): Promise<TurnoVista> {
    exigirValidos([
      'servicioId' in datos ? validarServicioId(datos.servicioId) : null,
      'fecha' in datos ? validarFecha(datos.fecha) : null,
      'horaInicio' in datos ? validarHora(datos.horaInicio) : null,
      'notaCliente' in datos ? validarNota(datos.notaCliente) : null,
    ]);

    await this.dataSource.transaction(async (em) => {
      const turno = await this.turnoVigente(em, negocio.id, turnoId);
      const fecha = (datos.fecha as string | undefined) ?? turno.fecha;
      const horaInicio =
        (datos.horaInicio as string | undefined) ??
        turno.horaInicio.slice(0, 5);
      const cambiaServicio =
        'servicioId' in datos && datos.servicioId !== turno.servicioId;
      const servicio = cambiaServicio
        ? await this.servicioActivo(em, negocio.id, datos.servicioId as string)
        : await em.findOneByOrFail(Servicio, { id: turno.servicioId });
      const cambiaHorario =
        fecha !== turno.fecha || horaInicio !== turno.horaInicio.slice(0, 5);

      if (cambiaHorario) {
        exigirFuturo(fecha, horaInicio);
      }
      if (cambiaHorario || cambiaServicio) {
        await bloquearFechas(em, negocio.id, [turno.fecha, fecha]);
        await this.exigirDisponible(
          em,
          negocio,
          fecha,
          horaInicio,
          servicio.duracionMin,
          turno.id,
        );
      }

      turno.fecha = fecha;
      turno.horaInicio = horaInicio;
      turno.horaFin = aHora(
        rangoDelTurno(horaInicio, servicio.duracionMin).fin,
      );
      turno.servicioId = servicio.id;
      if ('notaCliente' in datos) {
        turno.notaCliente = textoOpcional(datos.notaCliente);
      }
      await em.save(turno);
    });
    return this.vista(turnoId);
  }

  /** Cancelación (CU 6, 2s; RF-26): libera el horario. */
  async cancelar(negocio: Negocio, turnoId: string): Promise<TurnoVista> {
    await this.dataSource.transaction(async (em) => {
      const turno = await this.turnoVigente(em, negocio.id, turnoId);
      turno.estado = EstadoTurno.CANCELADO;
      await em.save(turno);
    });
    return this.vista(turnoId);
  }

  private async vista(id: string): Promise<TurnoVista> {
    const turno = await this.dataSource.getRepository(Turno).findOneOrFail({
      where: { id },
      relations: { cliente: true, servicio: true },
    });
    return aVista(turno);
  }

  /** El turno debe ser del negocio (RNF-7, CP-S3-41) y no estar cancelado. */
  private async turnoVigente(
    em: EntityManager,
    negocioId: string,
    turnoId: string,
  ): Promise<Turno> {
    const turno = await em.findOne(Turno, {
      where: { id: turnoId, negocioId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!turno) {
      throw new NotFoundException('El turno no existe');
    }
    if (turno.estado === EstadoTurno.CANCELADO) {
      throw new ConflictException('El turno ya está cancelado');
    }
    return turno;
  }

  private async servicioActivo(
    em: EntityManager,
    negocioId: string,
    servicioId: string,
  ): Promise<Servicio> {
    const servicio = await em.findOneBy(Servicio, {
      id: servicioId,
      negocioId,
      activo: true,
    });
    if (!servicio) {
      throw invalido([
        { campo: 'servicioId', mensaje: 'El servicio elegido no existe' },
      ]);
    }
    return servicio;
  }

  /**
   * Devuelve el id del cliente. Si es nuevo, primero verifica la agenda y
   * después lo crea, en la misma transacción: si algo falla, no queda
   * ni el cliente ni el turno (CP-S3-56).
   */
  private async resolverCliente(
    em: EntityManager,
    negocioId: string,
    cliente: ClienteElegido,
    verificarAgenda: () => Promise<void>,
  ): Promise<string> {
    if ('id' in cliente) {
      const existente = await em.findOneBy(Cliente, {
        id: cliente.id,
        negocioId,
      });
      if (!existente) {
        throw invalido([
          { campo: 'cliente', mensaje: 'El cliente elegido no existe' },
        ]);
      }
      await verificarAgenda();
      return existente.id;
    }

    const yaExiste = invalido([
      {
        campo: 'telefono',
        mensaje: 'Ya hay un cliente con ese teléfono. Buscalo por teléfono.',
      },
    ]);
    if (
      await em.existsBy(Cliente, {
        negocioId,
        telefono: cliente.nuevo.telefono,
      })
    ) {
      throw yaExiste;
    }
    await verificarAgenda();
    try {
      const creado = await em.save(
        em.create(Cliente, { ...cliente.nuevo, negocioId }),
      );
      return creado.id;
    } catch (error) {
      // Otro alta con el mismo teléfono ganó la carrera (RF-89).
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw yaExiste;
      }
      throw error;
    }
  }

  /** CU 5 (5a) y CU 6 (4a): informa el conflicto y sugiere horarios. */
  private async exigirDisponible(
    em: EntityManager,
    negocio: Negocio,
    fecha: string,
    horaInicio: string,
    duracionMin: number,
    excluirId?: string,
  ): Promise<void> {
    const horario = (negocio.horarioDisponible ?? {}) as HorarioDisponible;
    const delDia = await em.findBy(Turno, {
      negocioId: negocio.id,
      fecha,
      estado: Not(EstadoTurno.CANCELADO),
    });
    const ocupados: Ocupado[] = delDia.map((turno) => ({
      id: turno.id,
      inicio: aMinutos(turno.horaInicio),
      fin: aMinutos(turno.horaFin),
    }));

    const motivo = motivoNoDisponible(
      horario,
      fecha,
      rangoDelTurno(horaInicio, duracionMin),
      ocupados,
      excluirId,
    );
    if (!motivo) {
      return;
    }

    const ahora = ahoraEnUruguay();
    throw new ConflictException({
      message:
        motivo === 'OCUPADO'
          ? 'Ese horario ya está ocupado.'
          : 'Ese horario está fuera del horario de atención.',
      motivo,
      sugerencias: sugerirHorarios(
        horario,
        fecha,
        duracionMin,
        ocupados,
        aMinutos(horaInicio),
        {
          excluirId,
          desde: fecha === ahora.fecha ? aMinutos(ahora.hora) + 1 : 0,
        },
      ),
    });
  }
}

function textoOpcional(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null;
}
