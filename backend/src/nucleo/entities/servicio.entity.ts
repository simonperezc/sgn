import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Negocio } from './negocio.entity';
import { Turno } from './turno.entity';

@Entity('servicio')
export class Servicio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ name: 'duracion_min', type: 'int' })
  duracionMin: number;

  /** numeric para no perder centavos; TypeORM lo devuelve como string. */
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  precio: string | null;

  @Column({ name: 'negocio_id', type: 'uuid' })
  negocioId: string;

  @ManyToOne(() => Negocio, (negocio) => negocio.servicios, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'negocio_id' })
  negocio: Negocio;

  @OneToMany(() => Turno, (turno) => turno.servicio)
  turnos: Turno[];
}
