import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Patch,
  Post,
  Put,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CognitoAuthGuard } from '../../auth/cognito-auth.guard';
import { Identidad } from '../../auth/identidad.decorator';
import type { IdentidadIAM } from '../../auth/identidad-iam';
import { Negocio } from '../entities/negocio.entity';
import { NegocioAccesoGuard, NegocioActual } from './negocio-acceso.guard';
import { TAMANO_MAXIMO_FOTO } from './foto';
import { NegocioService } from './negocio.service';
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
    return this.negocios.vista(negocio);
  }

  @Patch(':negocioId')
  @UseGuards(NegocioAccesoGuard)
  actualizar(
    @NegocioActual() negocio: Negocio,
    @Body() datos: DatosNegocio = {},
  ) {
    return this.negocios.actualizar(negocio, datos ?? {});
  }

  @Put(':negocioId/foto')
  @HttpCode(204)
  @UseGuards(NegocioAccesoGuard)
  @UseInterceptors(
    FileInterceptor('foto', { limits: { fileSize: TAMANO_MAXIMO_FOTO } }),
  )
  async guardarFoto(
    @NegocioActual() negocio: Negocio,
    @UploadedFile() archivo?: { buffer: Buffer },
  ): Promise<void> {
    await this.negocios.guardarFoto(negocio.id, archivo?.buffer);
  }

  @Get(':negocioId/foto')
  @Header('X-Content-Type-Options', 'nosniff')
  @UseGuards(NegocioAccesoGuard)
  async obtenerFoto(@NegocioActual() negocio: Negocio) {
    const foto = await this.negocios.obtenerFoto(negocio.id);
    return new StreamableFile(foto.datos, { type: foto.tipo });
  }
}
