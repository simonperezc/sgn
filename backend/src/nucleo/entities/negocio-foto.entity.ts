import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Negocio } from './negocio.entity';

/** Foto del negocio (RF-18). Va aparte para no traer los bytes con cada negocio. */
@Entity('negocio_foto')
export class NegocioFoto {
  @PrimaryColumn({ name: 'negocio_id', type: 'uuid' })
  negocioId: string;

  @OneToOne(() => Negocio, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'negocio_id' })
  negocio: Negocio;

  /** Tipo detectado a partir del contenido del archivo. */
  @Column()
  tipo: string;

  @Column({ type: 'bytea' })
  datos: Buffer;

  @UpdateDateColumn({ name: 'actualizada_en', type: 'timestamptz' })
  actualizadaEn: Date;
}
