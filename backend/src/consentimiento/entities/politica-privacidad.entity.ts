import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Versión de la política de privacidad / cláusula de consentimiento (RNF-15). */
@Entity('politica_privacidad')
export class PoliticaPrivacidad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  version: string;

  @Column({ type: 'text' })
  texto: string;

  @Column({ name: 'vigente_desde', type: 'timestamptz' })
  vigenteDesde: Date;
}
