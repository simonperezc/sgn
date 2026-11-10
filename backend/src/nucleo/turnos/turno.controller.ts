import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CognitoAuthGuard } from '../../auth/cognito-auth.guard';
import { Negocio } from '../entities/negocio.entity';
import {
  NegocioAccesoGuard,
  NegocioActual,
} from '../negocios/negocio-acceso.guard';
import { TurnoService } from './turno.service';
import type { DatosTurno } from './turno.service';

@Controller('negocios/:negocioId/turnos')
@UseGuards(CognitoAuthGuard, NegocioAccesoGuard)
export class TurnoController {
  constructor(private readonly turnos: TurnoService) {}

  @Get()
  listar(@NegocioActual() negocio: Negocio, @Query('fecha') fecha?: string) {
    return this.turnos.listar(negocio.id, fecha);
  }

  @Post()
  crear(@NegocioActual() negocio: Negocio, @Body() datos: DatosTurno = {}) {
    return this.turnos.crear(negocio, datos ?? {});
  }

  @Patch(':turnoId')
  actualizar(
    @NegocioActual() negocio: Negocio,
    @Param('turnoId', ParseUUIDPipe) turnoId: string,
    @Body() datos: DatosTurno = {},
  ) {
    return this.turnos.actualizar(negocio, turnoId, datos ?? {});
  }

  @Post(':turnoId/cancelar')
  @HttpCode(200)
  cancelar(
    @NegocioActual() negocio: Negocio,
    @Param('turnoId', ParseUUIDPipe) turnoId: string,
  ) {
    return this.turnos.cancelar(negocio, turnoId);
  }
}
