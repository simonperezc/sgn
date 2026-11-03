import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../nucleo/entities/usuario.entity';
import { EstadoConsentimiento } from './estado-consentimiento';
import { PoliticaPrivacidad } from './politica-privacidad.entity';

/**
 * Consentimiento otorgado (RF-80): versión de la política aceptada, fecha y hora
 * y estado. Se crea antes del registro en Cognito, sin usuario, y se vincula al
 * usuario cuando se crea su perfil local.
 */
@Entity('consentimiento_informado')
export class ConsentimientoInformado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'politica_id', type: 'uuid' })
  politicaId: string;

  @ManyToOne(() => PoliticaPrivacidad, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'politica_id' })
  politica: PoliticaPrivacidad;

  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  usuarioId: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  @Column({
    type: 'enum',
    enum: EstadoConsentimiento,
    enumName: 'estado_consentimiento',
    default: EstadoConsentimiento.ACEPTADO,
  })
  estado: EstadoConsentimiento;

  @Column({ name: 'fecha_hora', type: 'timestamptz', default: () => 'now()' })
  fechaHora: Date;

  @Column({ name: 'fecha_revocacion', type: 'timestamptz', nullable: true })
  fechaRevocacion: Date | null;
}
