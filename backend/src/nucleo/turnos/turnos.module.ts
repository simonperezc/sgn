import { Module } from '@nestjs/common';
import { ClienteController } from '../clientes/cliente.controller';
import { NegociosModule } from '../negocios/negocios.module';
import { TurnoController } from './turno.controller';
import { TurnoService } from './turno.service';

/** Agenda manual (CU 5 y 6) y búsqueda de clientes por teléfono (RF-91). */
@Module({
  imports: [NegociosModule],
  controllers: [TurnoController, ClienteController],
  providers: [TurnoService],
})
export class TurnosModule {}
