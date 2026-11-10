import { Module } from '@nestjs/common';
import { NegociosModule } from '../negocios/negocios.module';
import { ServicioController } from './servicio.controller';
import { ServicioService } from './servicio.service';

@Module({
  imports: [NegociosModule],
  controllers: [ServicioController],
  providers: [ServicioService],
})
export class ServiciosModule {}
