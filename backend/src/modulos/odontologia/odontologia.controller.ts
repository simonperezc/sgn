import { Controller, Get, UseGuards } from '@nestjs/common';
import { CognitoAuthGuard } from '../../auth/cognito-auth.guard';
import { Plantilla } from '../../nucleo/entities/enums';
import {
  NegocioAccesoGuard,
  PlantillaGuard,
  RequierePlantilla,
} from '../../nucleo/negocios/negocio-acceso.guard';

/** Módulo de odontología. Los tratamientos se implementan en su sprint. */
@Controller('negocios/:negocioId/odontologia')
@UseGuards(CognitoAuthGuard, NegocioAccesoGuard, PlantillaGuard)
@RequierePlantilla(Plantilla.ODONTOLOGIA)
export class OdontologiaController {
  @Get('tratamientos')
  listarTratamientos(): unknown[] {
    return [];
  }
}
