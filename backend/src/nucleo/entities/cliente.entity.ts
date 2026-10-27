import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Negocio } from './negocio.entity';
import { Turno } from './turno.entity';

/** El teléfono, en formato internacional, es único dentro de cada negocio (RF-89). */
@Entity('cliente')
@Unique('uq_cliente_negocio_telefono', ['negocioId', 'telefono'])
export class Cliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ length: 20 })
  telefono: string;

  @Column({ type: 'varchar', nullable: true })
  correo: string | null;

  @Column({ name: 'telegram_chat_id', type: 'varchar', nullable: true })
  telegramChatId: string | null;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @Column({ name: 'negocio_id', type: 'uuid' })
  negocioId: string;

  @ManyToOne(() => Negocio, (negocio) => negocio.clientes, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'negocio_id' })
  negocio: Negocio;

  @OneToMany(() => Turno, (turno) => turno.cliente)
  turnos: Turno[];

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}
