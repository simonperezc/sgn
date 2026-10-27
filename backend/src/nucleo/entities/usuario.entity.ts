import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Rol } from './enums';
import { Negocio } from './negocio.entity';

/**
 * Perfil local del usuario. La contraseña, el OTP y el MFA los gestiona
 * Cognito: acá solo se guarda su identificador (RNF-5, RNF-29).
 */
@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_iam', unique: true })
  idIAM: string;

  @Column()
  nombre: string;

  @Column()
  correo: string;

  @Column({ type: 'varchar', nullable: true })
  telefono: string | null;

  @Column({ type: 'enum', enum: Rol, enumName: 'rol', default: Rol.USUARIO })
  rol: Rol;

  @OneToMany(() => Negocio, (negocio) => negocio.propietario)
  negocios: Negocio[];

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}
