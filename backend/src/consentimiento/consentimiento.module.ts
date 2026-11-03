import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentimientoController } from './consentimiento.controller';
import { ConsentimientoService } from './consentimiento.service';
import { ConsentimientoInformado } from './entities/consentimiento-informado.entity';
import { PoliticaPrivacidad } from './entities/politica-privacidad.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PoliticaPrivacidad, ConsentimientoInformado]),
  ],
  controllers: [ConsentimientoController],
  providers: [ConsentimientoService],
  exports: [ConsentimientoService, TypeOrmModule],
})
export class ConsentimientoModule {}
