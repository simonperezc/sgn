import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { Negocio } from './entities/negocio.entity';
import { Cliente } from './entities/cliente.entity';
import { Servicio } from './entities/servicio.entity';
import { Turno } from './entities/turno.entity';
import { NegocioFoto } from './entities/negocio-foto.entity';
import { ClienteService } from './cliente.service';

/** Núcleo común: entidades base de las que dependen los módulos por rubro. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      Negocio,
      NegocioFoto,
      Cliente,
      Servicio,
      Turno,
    ]),
  ],
  providers: [ClienteService],
  exports: [TypeOrmModule, ClienteService],
})
export class NucleoModule {}
