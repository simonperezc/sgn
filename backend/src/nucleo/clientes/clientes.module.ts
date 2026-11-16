import { Module } from '@nestjs/common';
import { NegociosModule } from '../negocios/negocios.module';
import { ClienteController } from './cliente.controller';
import { FichaClienteService } from './ficha-cliente.service';

/** Clientes del negocio: alta, búsqueda por teléfono y ficha (CU 11). */
@Module({
  imports: [NegociosModule],
  controllers: [ClienteController],
  providers: [FichaClienteService],
})
export class ClientesModule {}
