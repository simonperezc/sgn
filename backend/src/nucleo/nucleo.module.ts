import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { Negocio } from './entities/negocio.entity';
import { Cliente } from './entities/cliente.entity';
import { Servicio } from './entities/servicio.entity';
import { Turno } from './entities/turno.entity';

/** Núcleo común: entidades base de las que dependen los módulos por rubro. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, Negocio, Cliente, Servicio, Turno]),
  ],
  exports: [TypeOrmModule],
})
export class NucleoModule {}
