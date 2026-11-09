import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CognitoAuthGuard } from '../../auth/cognito-auth.guard';
import { Identidad } from '../../auth/identidad.decorator';
import type { IdentidadIAM } from '../../auth/identidad-iam';
import { Negocio } from '../entities/negocio.entity';
import { NegocioAccesoGuard, NegocioActual } from './negocio-acceso.guard';
import { aVista, NegocioService } from './negocio.service';
import type { DatosNegocio } from './negocio.service';

@Controller('negocios')
@UseGuards(CognitoAuthGuard)
export class NegocioController {
  constructor(private readonly negocios: NegocioService) {}

  @Post()
  crear(
    @Identidad() identidad: IdentidadIAM,
    @Body() datos: DatosNegocio = {},
  ) {
    return this.negocios.crear(identidad.idIAM, datos ?? {});
  }

  @Get()
  listar(@Identidad() identidad: IdentidadIAM) {
    return this.negocios.listar(identidad.idIAM);
  }

  @Get(':negocioId')
  @UseGuards(NegocioAccesoGuard)
  obtener(@NegocioActual() negocio: Negocio) {
    return aVista(negocio);
  }

  @Patch(':negocioId')
  @UseGuards(NegocioAccesoGuard)
  actualizar(
    @NegocioActual() negocio: Negocio,
    @Body() datos: DatosNegocio = {},
  ) {
    return this.negocios.actualizar(negocio, datos ?? {});
  }
}
