import { Plantilla } from '../entities/enums';

export const DIAS_SEMANA = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
] as const;

export type DiaSemana = (typeof DIAS_SEMANA)[number];

/** Rango de atención en formato HH:MM. */
export interface Franja {
  inicio: string;
  fin: string;
}

/** Horario por día, con una o más franjas (por ejemplo, corte al mediodía). */
export type HorarioDisponible = Partial<Record<DiaSemana, Franja[]>>;

export interface ErrorCampo {
  campo: string;
  mensaje: string;
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_NOMBRE = 120;
const MAX_CONTACTO = 120;
const MAX_DIRECCION = 200;

/** Un nombre compuesto solo por espacios cuenta como vacío (CP-S3-06). */
export function validarNombre(valor: unknown): ErrorCampo | null {
  if (typeof valor !== 'string' || valor.trim() === '') {
    return { campo: 'nombre', mensaje: 'Ingresá el nombre del negocio' };
  }
  if (valor.trim().length > MAX_NOMBRE) {
    return {
      campo: 'nombre',
      mensaje: `El nombre no puede superar los ${MAX_NOMBRE} caracteres`,
    };
  }
  return null;
}

/**
 * El horario es obligatorio (RF-17). Cada franja debe terminar después de
 * empezar (CP-S3-07) y las franjas de un mismo día no pueden superponerse.
 */
export function validarHorario(valor: unknown): ErrorCampo | null {
  const error = (mensaje: string): ErrorCampo => ({
    campo: 'horarioDisponible',
    mensaje,
  });
  const faltante = error('Definí el horario disponible del negocio');

  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return faltante;
  }

  let hayFranjas = false;
  for (const [dia, franjas] of Object.entries(valor)) {
    if (!(DIAS_SEMANA as readonly string[]).includes(dia)) {
      return error(`El día "${dia}" no es válido`);
    }
    if (!Array.isArray(franjas)) {
      return error(`El horario del ${dia} no es válido`);
    }

    const validas: Franja[] = [];
    for (const franja of franjas as unknown[]) {
      const { inicio, fin } = (franja ?? {}) as Record<string, unknown>;
      if (
        typeof inicio !== 'string' ||
        typeof fin !== 'string' ||
        !HORA.test(inicio) ||
        !HORA.test(fin)
      ) {
        return error(`Revisá las horas del ${dia}: usá el formato HH:MM`);
      }
      if (fin <= inicio) {
        return error(
          `La hora de fin debe ser posterior a la de inicio (${dia})`,
        );
      }
      validas.push({ inicio, fin });
    }

    validas.sort((a, b) => a.inicio.localeCompare(b.inicio));
    for (let i = 1; i < validas.length; i++) {
      if (validas[i].inicio < validas[i - 1].fin) {
        return error(`Las franjas del ${dia} se superponen`);
      }
    }
    hayFranjas ||= validas.length > 0;
  }

  return hayFranjas ? null : faltante;
}

export function validarPlantilla(valor: unknown): ErrorCampo | null {
  if (!Object.values(Plantilla).includes(valor as Plantilla)) {
    return {
      campo: 'plantilla',
      mensaje: 'Elegí una plantilla para el negocio',
    };
  }
  return null;
}

/** Contacto y dirección son opcionales; si vienen, deben ser texto acotado. */
export function validarTextoOpcional(
  campo: 'contacto' | 'direccion',
  valor: unknown,
): ErrorCampo | null {
  if (valor === undefined || valor === null) {
    return null;
  }
  const maximo = campo === 'contacto' ? MAX_CONTACTO : MAX_DIRECCION;
  if (typeof valor !== 'string' || valor.length > maximo) {
    return {
      campo,
      mensaje: `El campo no puede superar los ${maximo} caracteres`,
    };
  }
  return null;
}

/** Deja solo los días con franjas, ordenadas por hora de inicio. */
export function normalizarHorario(valor: HorarioDisponible): HorarioDisponible {
  const resultado: HorarioDisponible = {};
  for (const dia of DIAS_SEMANA) {
    const franjas = valor[dia];
    if (franjas?.length) {
      resultado[dia] = [...franjas]
        .sort((a, b) => a.inicio.localeCompare(b.inicio))
        .map(({ inicio, fin }) => ({ inicio, fin }));
    }
  }
  return resultado;
}
