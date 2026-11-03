import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../nucleo/entities/usuario.entity';
import type { IdentidadIAM } from './identidad-iam';

@Injectable()
export class PerfilService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
  ) {}

  /**
   * Devuelve el perfil local del usuario y lo crea en su primer ingreso,
   * vinculado al identificador del IAM (RF-83). Nunca crea duplicados
   * (CP-S2-16), ni siquiera con dos ingresos simultáneos.
   */
  async sincronizar(identidad: IdentidadIAM): Promise<Usuario> {
    await this.usuarios
      .createQueryBuilder()
      .insert()
      .into(Usuario)
      .values({
        idIAM: identidad.idIAM,
        nombre: identidad.nombre,
        correo: identidad.correo,
      })
      .orIgnore()
      .execute();

    return this.usuarios.findOneByOrFail({ idIAM: identidad.idIAM });
  }
}
