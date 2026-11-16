import { Module } from '@nestjs/common';
import { NegociosModule } from '../negocios/negocios.module';
import { TurnoController } from './turno.controller';
import { TurnoService } from './turno.service';

/** Agenda manual (CU 5 y 6). */
@Module({
  imports: [NegociosModule],
  controllers: [TurnoController],
  providers: [TurnoService],
})
export class TurnosModule {}
