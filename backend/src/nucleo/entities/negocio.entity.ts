import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Plantilla } from './enums';
import { Usuario } from './usuario.entity';
import { Servicio } from './servicio.entity';
import { Cliente } from './cliente.entity';
import { Turno } from './turno.entity';

@Entity('negocio')
export class Negocio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ type: 'varchar', nullable: true })
  foto: string | null;

  @Column({ type: 'varchar', nullable: true })
  direccion: string | null;

  @Column({ type: 'varchar', nullable: true })
  contacto: string | null;

  /** Horario de atención por día; se exige antes de habilitar los paneles (RF-17). */
  @Column({ name: 'horario_disponible', type: 'jsonb', nullable: true })
  horarioDisponible: Record<string, unknown> | null;

  @Column({ type: 'enum', enum: Plantilla, enumName: 'plantilla' })
  plantilla: Plantilla;

  @Column({ default: true })
  activo: boolean;

  @Column({ name: 'propietario_id', type: 'uuid' })
  propietarioId: string;

  @ManyToOne(() => Usuario, (usuario) => usuario.negocios, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'propietario_id' })
  propietario: Usuario;

  @OneToMany(() => Servicio, (servicio) => servicio.negocio)
  servicios: Servicio[];

  @OneToMany(() => Cliente, (cliente) => cliente.negocio)
  clientes: Cliente[];

  @OneToMany(() => Turno, (turno) => turno.negocio)
  turnos: Turno[];

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}
