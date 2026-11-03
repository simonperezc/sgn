import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Usuario } from '../nucleo/entities/usuario.entity';
import { ConsentimientoInformado } from '../consentimiento/entities/consentimiento-informado.entity';
import { EstadoConsentimiento } from '../consentimiento/entities/estado-consentimiento';
import type { IdentidadIAM } from './identidad-iam';

/** Código que el frontend reconoce para mostrar la cláusula (RF-79). */
export const CONSENTIMIENTO_REQUERIDO = 'CONSENTIMIENTO_REQUERIDO';

@Injectable()
export class PerfilService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Devuelve el perfil local del usuario y lo crea en su primer ingreso,
   * vinculado al identificador del IAM (RF-83), sin duplicarlo (CP-S2-16).
   *
   * No guarda ningún dato personal si el usuario no tiene un consentimiento
   * aceptado (RF-79): un usuario nuevo, o uno sin consentimiento, debe traer
   * el id del consentimiento que aceptó, que queda vinculado a su perfil.
   */
  async sincronizar(
    identidad: IdentidadIAM,
    consentimientoId?: string,
  ): Promise<Usuario> {
    return this.dataSource.transaction(async (em) => {
      const existente = await em.findOneBy(Usuario, { idIAM: identidad.idIAM });
      if (existente && (await this.tieneConsentimiento(em, existente.id))) {
        return existente;
      }

      if (!consentimientoId) {
        throw this.consentimientoRequerido();
      }

      // Bloquea el consentimiento para que dos ingresos simultáneos no lo
      // vinculen a usuarios distintos.
      const consentimiento = await em.findOne(ConsentimientoInformado, {
        where: { id: consentimientoId, estado: EstadoConsentimiento.ACEPTADO },
        lock: { mode: 'pessimistic_write' },
      });
      if (!consentimiento) {
        throw this.consentimientoRequerido();
      }

      await em
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
      const usuario = await em.findOneByOrFail(Usuario, {
        idIAM: identidad.idIAM,
      });

      if (consentimiento.usuarioId && consentimiento.usuarioId !== usuario.id) {
        // El consentimiento ya pertenece a otra persona.
        throw this.consentimientoRequerido();
      }
      if (!consentimiento.usuarioId) {
        await em.update(
          ConsentimientoInformado,
          { id: consentimiento.id },
          { usuarioId: usuario.id },
        );
      }
      return usuario;
    });
  }

  private async tieneConsentimiento(
    em: EntityManager,
    usuarioId: string,
  ): Promise<boolean> {
    return em.existsBy(ConsentimientoInformado, {
      usuarioId,
      estado: EstadoConsentimiento.ACEPTADO,
    });
  }

  private consentimientoRequerido(): ForbiddenException {
    return new ForbiddenException({
      codigo: CONSENTIMIENTO_REQUERIDO,
      message: 'Para continuar tenés que aceptar la cláusula de consentimiento',
    });
  }
}
