import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { NucleoModule } from '../nucleo.module';
import { NegocioAccesoGuard, PlantillaGuard } from './negocio-acceso.guard';
import { NegocioController } from './negocio.controller';
import { NegocioService } from './negocio.service';

@Module({
  imports: [NucleoModule, AuthModule],
  controllers: [NegocioController],
  providers: [NegocioService, NegocioAccesoGuard, PlantillaGuard],
  exports: [NegocioAccesoGuard, PlantillaGuard, NucleoModule, AuthModule],
})
export class NegociosModule {}
