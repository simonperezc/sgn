import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Canal, EstadoTurno, ResultadoTurno } from './enums';
import { Negocio } from './negocio.entity';
import { Cliente } from './cliente.entity';
import { Servicio } from './servicio.entity';

@Entity('turno')
export class Turno {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio: string;

  @Column({ name: 'hora_fin', type: 'time' })
  horaFin: string;

  @Column({ type: 'enum', enum: EstadoTurno, enumName: 'estado_turno' })
  estado: EstadoTurno;

  @Column({ type: 'enum', enum: Canal, enumName: 'canal' })
  canal: Canal;

  @Column({ name: 'nota_cliente', type: 'text', nullable: true })
  notaCliente: string | null;

  @Column({
    type: 'enum',
    enum: ResultadoTurno,
    enumName: 'resultado_turno',
    nullable: true,
  })
  resultado: ResultadoTurno | null;

  /** Se cifrará en el Sprint 4 (RNF-32). */
  @Column({ name: 'nota_cierre', type: 'text', nullable: true })
  notaCierre: string | null;

  @Column({ name: 'fecha_cierre', type: 'timestamptz', nullable: true })
  fechaCierre: Date | null;

  @Column({ name: 'negocio_id', type: 'uuid' })
  negocioId: string;

  @ManyToOne(() => Negocio, (negocio) => negocio.turnos, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'negocio_id' })
  negocio: Negocio;

  @Column({ name: 'cliente_id', type: 'uuid' })
  clienteId: string;

  @ManyToOne(() => Cliente, (cliente) => cliente.turnos, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @Column({ name: 'servicio_id', type: 'uuid' })
  servicioId: string;

  @ManyToOne(() => Servicio, (servicio) => servicio.turnos, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicio;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}
