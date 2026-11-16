import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, QueryFailedError } from 'typeorm';
import { Cliente } from '../entities/cliente.entity';
import { EstadoTurno, ResultadoTurno } from '../entities/enums';
import { Turno } from '../entities/turno.entity';
import type { ErrorCampo } from '../negocios/negocio.validacion';
import {
  validarCorreo,
  validarNombreCliente,
  validarNotas,
  validarTelefono,
} from './cliente.validacion';
import { normalizarTelefono } from './telefono';

export type DatosCliente = Record<string, unknown>;

export interface ClienteVista {
  id: string;
  nombre: string;
  telefono: string;
  correo: string | null;
  notas: string | null;
}

export interface FichaCliente extends ClienteVista {
  historial: {
    id: string;
    fecha: string;
    horaInicio: string;
    servicio: string;
    estado: EstadoTurno;
    resultado: ResultadoTurno | null;
    notaCierre: string | null;
  }[];
}

function aVista(cliente: Cliente): ClienteVista {
  return {
    id: cliente.id,
    nombre: cliente.nombre,
    telefono: cliente.telefono,
    correo: cliente.correo,
    notas: cliente.notas,
  };
}

function textoOpcional(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null;
}

/** Registro, ficha y edición de clientes del negocio (CU 11). */
@Injectable()
export class FichaClienteService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async crear(negocioId: string, datos: DatosCliente): Promise<ClienteVista> {
    this.exigirValidos([
      validarNombreCliente(datos.nombre),
      validarTelefono(datos.telefono),
      validarCorreo(datos.correo),
      validarNotas(datos.notas),
    ]);
    const telefono = normalizarTelefono(datos.telefono) as string;

    return this.dataSource.transaction(async (em) => {
      await this.exigirTelefonoLibre(em, negocioId, telefono);
      const cliente = await this.guardar(
        em,
        em.create(Cliente, {
          negocioId,
          nombre: (datos.nombre as string).trim(),
          telefono,
          correo: textoOpcional(datos.correo),
          notas: textoOpcional(datos.notas),
        }),
        negocioId,
      );
      return aVista(cliente);
    });
  }

  /** Ficha con el historial de turnos del cliente (RF-43), del más reciente al más antiguo. */
  async ficha(negocioId: string, clienteId: string): Promise<FichaCliente> {
    const em = this.dataSource.manager;
    const cliente = await this.buscar(em, negocioId, clienteId);
    const turnos = await em.find(Turno, {
      where: { negocioId, clienteId, estado: Not(EstadoTurno.CANCELADO) },
      relations: { servicio: true },
      order: { fecha: 'DESC', horaInicio: 'DESC' },
    });
    return {
      ...aVista(cliente),
      historial: turnos.map((turno) => ({
        id: turno.id,
        fecha: turno.fecha,
        horaInicio: turno.horaInicio.slice(0, 5),
        servicio: turno.servicio.nombre,
        estado: turno.estado,
        resultado: turno.resultado,
        notaCierre: turno.notaCierre,
      })),
    };
  }

  /** Datos de contacto y notas (RF-44). El teléfono sigue siendo único (RF-89). */
  async actualizar(
    negocioId: string,
    clienteId: string,
    datos: DatosCliente,
  ): Promise<ClienteVista> {
    this.exigirValidos([
      'nombre' in datos ? validarNombreCliente(datos.nombre) : null,
      'telefono' in datos ? validarTelefono(datos.telefono) : null,
      'correo' in datos ? validarCorreo(datos.correo) : null,
      'notas' in datos ? validarNotas(datos.notas) : null,
    ]);

    return this.dataSource.transaction(async (em) => {
      const cliente = await this.buscar(em, negocioId, clienteId);
      if ('telefono' in datos) {
        const telefono = normalizarTelefono(datos.telefono) as string;
        if (telefono !== cliente.telefono) {
          await this.exigirTelefonoLibre(em, negocioId, telefono);
          cliente.telefono = telefono;
        }
      }
      if ('nombre' in datos) {
        cliente.nombre = (datos.nombre as string).trim();
      }
      if ('correo' in datos) {
        cliente.correo = textoOpcional(datos.correo);
      }
      if ('notas' in datos) {
        cliente.notas = textoOpcional(datos.notas);
      }
      return aVista(await this.guardar(em, cliente, negocioId));
    });
  }

  /** El cliente debe ser del negocio (RNF-7, CP-S3-52). */
  private async buscar(
    em: EntityManager,
    negocioId: string,
    clienteId: string,
  ): Promise<Cliente> {
    const cliente = await em.findOneBy(Cliente, { id: clienteId, negocioId });
    if (!cliente) {
      throw new NotFoundException('El cliente no existe');
    }
    return cliente;
  }

  /** CU 11 (2a): informa la coincidencia y el cliente existente. */
  private async exigirTelefonoLibre(
    em: EntityManager,
    negocioId: string,
    telefono: string,
  ): Promise<void> {
    const existente = await em.findOneBy(Cliente, { negocioId, telefono });
    if (existente) {
      throw this.duplicado(existente);
    }
  }

  private duplicado(existente: Cliente): ConflictException {
    return new ConflictException({
      message: `Ya hay un cliente con ese teléfono: ${existente.nombre}.`,
      clienteExistente: { id: existente.id, nombre: existente.nombre },
    });
  }

  /** Si otra operación registró el mismo teléfono a la vez, gana la restricción única. */
  private async guardar(
    em: EntityManager,
    cliente: Cliente,
    negocioId: string,
  ): Promise<Cliente> {
    try {
      return await em.save(cliente);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        const existente = await this.dataSource
          .getRepository(Cliente)
          .findOneBy({ negocioId, telefono: cliente.telefono });
        if (existente) {
          throw this.duplicado(existente);
        }
      }
      throw error;
    }
  }

  private exigirValidos(errores: (ErrorCampo | null)[]): void {
    const campos = errores.filter((error) => error !== null);
    if (campos.length > 0) {
      throw new BadRequestException({
        message: 'Revisá los datos del cliente',
        campos,
      });
    }
  }
}
