import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CognitoAuthGuard } from '../../auth/cognito-auth.guard';
import { ClienteService } from '../cliente.service';
import { Negocio } from '../entities/negocio.entity';
import {
  NegocioAccesoGuard,
  NegocioActual,
} from '../negocios/negocio-acceso.guard';
import { FichaClienteService } from './ficha-cliente.service';
import type { DatosCliente } from './ficha-cliente.service';
import { MENSAJE_TELEFONO_INVALIDO, normalizarTelefono } from './telefono';

export interface ClienteResumen {
  id: string;
  nombre: string;
  telefono: string;
}

@Controller('negocios/:negocioId/clientes')
@UseGuards(CognitoAuthGuard, NegocioAccesoGuard)
export class ClienteController {
  constructor(
    private readonly clientes: ClienteService,
    private readonly fichas: FichaClienteService,
  ) {}

  /** Con ?telefono= busca al cliente por su teléfono normalizado (RF-91). */
  @Get()
  async listar(
    @NegocioActual() negocio: Negocio,
    @Query('telefono') telefono?: string,
  ): Promise<ClienteResumen[]> {
    if (telefono === undefined) {
      const todos = await this.clientes.listarPorNegocio(negocio.id);
      return todos.map(({ id, nombre, telefono: tel }) => ({
        id,
        nombre,
        telefono: tel,
      }));
    }

    const normalizado = normalizarTelefono(telefono);
    if (!normalizado) {
      throw new BadRequestException({
        message: 'Revisá el teléfono',
        campos: [{ campo: 'telefono', mensaje: MENSAJE_TELEFONO_INVALIDO }],
      });
    }
    const cliente = await this.clientes.buscarPorTelefono(
      negocio.id,
      normalizado,
    );
    return cliente
      ? [{ id: cliente.id, nombre: cliente.nombre, telefono: cliente.telefono }]
      : [];
  }

  /** Alta manual (CU 11, RF-42). */
  @Post()
  crear(@NegocioActual() negocio: Negocio, @Body() datos: DatosCliente = {}) {
    return this.fichas.crear(negocio.id, datos ?? {});
  }

  /** Ficha con historial (RF-43). */
  @Get(':clienteId')
  ficha(
    @NegocioActual() negocio: Negocio,
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ) {
    return this.fichas.ficha(negocio.id, clienteId);
  }

  /** Notas y datos de contacto (RF-44). */
  @Patch(':clienteId')
  actualizar(
    @NegocioActual() negocio: Negocio,
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() datos: DatosCliente = {},
  ) {
    return this.fichas.actualizar(negocio.id, clienteId, datos ?? {});
  }
}
