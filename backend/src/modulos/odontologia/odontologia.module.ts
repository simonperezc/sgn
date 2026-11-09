import { Module } from '@nestjs/common';
import { NegociosModule } from '../../nucleo/negocios/negocios.module';
import { OdontologiaController } from './odontologia.controller';

@Module({
  imports: [NegociosModule],
  controllers: [OdontologiaController],
})
export class OdontologiaModule {}
