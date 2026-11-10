import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Negocio } from '../entities/negocio.entity';
import { NegocioFoto } from '../entities/negocio-foto.entity';
import { Usuario } from '../entities/usuario.entity';
import { Plantilla } from '../entities/enums';
import { panelesPorPlantilla } from './paneles';
import { detectarTipoImagen } from './foto';
import {
  ErrorCampo,
  HorarioDisponible,
  normalizarHorario,
  validarHorario,
  validarNombre,
  validarPlantilla,
  validarTextoOpcional,
} from './negocio.validacion';

export type DatosNegocio = Record<string, unknown>;

/** Lo que recibe el frontend: el negocio más los paneles de su plantilla. */
export interface NegocioVista {
  id: string;
  nombre: string;
  direccion: string | null;
  contacto: string | null;
  horarioDisponible: Record<string, unknown> | null;
  plantilla: Plantilla;
  paneles: string[];
  tieneFoto: boolean;
}

function aVista(negocio: Negocio, tieneFoto: boolean): NegocioVista {
  return {
    id: negocio.id,
    nombre: negocio.nombre,
    direccion: negocio.direccion,
    contacto: negocio.contacto,
    horarioDisponible: negocio.horarioDisponible,
    plantilla: negocio.plantilla,
    paneles: panelesPorPlantilla(negocio.plantilla),
    tieneFoto,
  };
}

@Injectable()
export class NegocioService {
  constructor(
    @InjectRepository(Negocio)
    private readonly negocios: Repository<Negocio>,
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
    @InjectRepository(NegocioFoto)
    private readonly fotos: Repository<NegocioFoto>,
  ) {}

  /** Crea un negocio del usuario autenticado (RF-15, RF-17, RF-22, RF-23). */
  async crear(idIAM: string, datos: DatosNegocio): Promise<NegocioVista> {
    this.exigirValidos([
      validarNombre(datos.nombre),
      validarHorario(datos.horarioDisponible),
      validarPlantilla(datos.plantilla),
      validarTextoOpcional('contacto', datos.contacto),
      validarTextoOpcional('direccion', datos.direccion),
    ]);

    const propietario = await this.usuarios.findOneByOrFail({ idIAM });
    const negocio = await this.negocios.save(
      this.negocios.create({
        nombre: (datos.nombre as string).trim(),
        contacto: textoOpcional(datos.contacto),
        direccion: textoOpcional(datos.direccion),
        horarioDisponible: horarioNormalizado(datos.horarioDisponible),
        plantilla: datos.plantilla as Plantilla,
        propietarioId: propietario.id,
      }),
    );
    return aVista(negocio, false);
  }

  /** Negocios cuyo dueño es el usuario autenticado (RF-15). */
  async listar(idIAM: string): Promise<NegocioVista[]> {
    const negocios = await this.negocios.find({
      where: { propietario: { idIAM } },
      order: { creadoEn: 'ASC' },
    });
    const conFoto = await this.fotos.find({
      select: { negocioId: true },
      where: { negocioId: In(negocios.map((negocio) => negocio.id)) },
    });
    const ids = new Set(conFoto.map((foto) => foto.negocioId));
    return negocios.map((negocio) => aVista(negocio, ids.has(negocio.id)));
  }

  async vista(negocio: Negocio): Promise<NegocioVista> {
    const tieneFoto = await this.fotos.existsBy({ negocioId: negocio.id });
    return aVista(negocio, tieneFoto);
  }

  /** Guarda la foto solo si el contenido es una imagen (RF-18, CP-S3-17). */
  async guardarFoto(negocioId: string, datos?: Buffer): Promise<void> {
    const tipo = datos ? detectarTipoImagen(datos) : null;
    if (!datos || !tipo) {
      throw new BadRequestException(
        'El archivo no es una imagen válida. Usá una foto JPG, PNG o WebP.',
      );
    }
    await this.fotos.save({ negocioId, tipo, datos });
  }

  async obtenerFoto(negocioId: string): Promise<NegocioFoto> {
    const foto = await this.fotos.findOneBy({ negocioId });
    if (!foto) {
      throw new NotFoundException('El negocio no tiene foto');
    }
    return foto;
  }

  /** Edita los datos del negocio. La plantilla no se puede cambiar (RF-22). */
  async actualizar(
    negocio: Negocio,
    datos: DatosNegocio,
  ): Promise<NegocioVista> {
    if ('plantilla' in datos) {
      throw new BadRequestException(
        'La plantilla no se puede modificar una vez registrado el negocio',
      );
    }

    const errores: (ErrorCampo | null)[] = [];
    if ('nombre' in datos) {
      errores.push(validarNombre(datos.nombre));
    }
    if ('horarioDisponible' in datos) {
      errores.push(validarHorario(datos.horarioDisponible));
    }
    if ('contacto' in datos) {
      errores.push(validarTextoOpcional('contacto', datos.contacto));
    }
    if ('direccion' in datos) {
      errores.push(validarTextoOpcional('direccion', datos.direccion));
    }
    this.exigirValidos(errores);

    if ('nombre' in datos) {
      negocio.nombre = (datos.nombre as string).trim();
    }
    if ('horarioDisponible' in datos) {
      negocio.horarioDisponible = horarioNormalizado(datos.horarioDisponible);
    }
    if ('contacto' in datos) {
      negocio.contacto = textoOpcional(datos.contacto);
    }
    if ('direccion' in datos) {
      negocio.direccion = textoOpcional(datos.direccion);
    }
    return this.vista(await this.negocios.save(negocio));
  }

  private exigirValidos(errores: (ErrorCampo | null)[]): void {
    const campos = errores.filter((error) => error !== null);
    if (campos.length > 0) {
      throw new BadRequestException({
        message: 'Revisá los datos del negocio',
        campos,
      });
    }
  }
}

function textoOpcional(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null;
}

function horarioNormalizado(valor: unknown): Record<string, unknown> {
  return normalizarHorario(valor as HorarioDisponible);
}
