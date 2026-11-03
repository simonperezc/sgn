import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { ConsentimientoInformado } from './entities/consentimiento-informado.entity';
import { EstadoConsentimiento } from './entities/estado-consentimiento';
import { PoliticaPrivacidad } from './entities/politica-privacidad.entity';

@Injectable()
export class ConsentimientoService {
  constructor(
    @InjectRepository(PoliticaPrivacidad)
    private readonly politicas: Repository<PoliticaPrivacidad>,
    @InjectRepository(ConsentimientoInformado)
    private readonly consentimientos: Repository<ConsentimientoInformado>,
  ) {}

  /** Política vigente: la más reciente cuya fecha de vigencia ya llegó (RF-76, RF-77). */
  async obtenerPoliticaVigente(): Promise<PoliticaPrivacidad> {
    const politica = await this.politicas.findOne({
      where: { vigenteDesde: LessThanOrEqual(new Date()) },
      order: { vigenteDesde: 'DESC' },
    });
    if (!politica) {
      throw new NotFoundException('No hay una política de privacidad vigente');
    }
    return politica;
  }

  /**
   * Registra la aceptación de la versión que el usuario efectivamente vio
   * (RF-78, RF-80, RNF-15, CP-S2-10), aunque mientras tanto se haya publicado
   * otra. Todavía no hay usuario: se vincula al crear el perfil local.
   */
  async registrarAceptacion(
    politicaId: string,
  ): Promise<ConsentimientoInformado> {
    const politica = await this.politicas.findOneBy({ id: politicaId });
    if (!politica) {
      throw new NotFoundException('La versión de la política no existe');
    }
    const guardado = await this.consentimientos.save(
      this.consentimientos.create({
        politicaId: politica.id,
        estado: EstadoConsentimiento.ACEPTADO,
      }),
    );
    return this.consentimientos.findOneOrFail({
      where: { id: guardado.id },
      relations: { politica: true },
    });
  }
}
