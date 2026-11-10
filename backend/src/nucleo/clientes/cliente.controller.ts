import {
  BadRequestException,
  Controller,
  Get,
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
import { MENSAJE_TELEFONO_INVALIDO, normalizarTelefono } from './telefono';

export interface ClienteResumen {
  id: string;
  nombre: string;
  telefono: string;
}

@Controller('negocios/:negocioId/clientes')
@UseGuards(CognitoAuthGuard, NegocioAccesoGuard)
export class ClienteController {
  constructor(private readonly clientes: ClienteService) {}

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
}
