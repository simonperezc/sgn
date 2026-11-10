import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CognitoAuthGuard } from '../../auth/cognito-auth.guard';
import { Negocio } from '../entities/negocio.entity';
import {
  NegocioAccesoGuard,
  NegocioActual,
} from '../negocios/negocio-acceso.guard';
import { ServicioService } from './servicio.service';
import type { DatosServicio } from './servicio.service';

@Controller('negocios/:negocioId/servicios')
@UseGuards(CognitoAuthGuard, NegocioAccesoGuard)
export class ServicioController {
  constructor(private readonly servicios: ServicioService) {}

  @Get()
  listar(@NegocioActual() negocio: Negocio) {
    return this.servicios.listar(negocio.id);
  }

  @Post()
  crear(@NegocioActual() negocio: Negocio, @Body() datos: DatosServicio = {}) {
    return this.servicios.crear(negocio.id, datos ?? {});
  }

  @Patch(':servicioId')
  actualizar(
    @NegocioActual() negocio: Negocio,
    @Param('servicioId', ParseUUIDPipe) servicioId: string,
    @Body() datos: DatosServicio = {},
  ) {
    return this.servicios.actualizar(negocio, servicioId, datos ?? {});
  }

  @Delete(':servicioId')
  @HttpCode(204)
  async eliminar(
    @NegocioActual() negocio: Negocio,
    @Param('servicioId', ParseUUIDPipe) servicioId: string,
  ): Promise<void> {
    await this.servicios.eliminar(negocio.id, servicioId);
  }
}
