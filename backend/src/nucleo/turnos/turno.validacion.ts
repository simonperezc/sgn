import {
  aHora,
  aMinutos,
  dentroDelHorario,
  diaDeLaSemana,
  Rango,
  seSuperponen,
} from '../agenda/disponibilidad';
import type {
  ErrorCampo,
  HorarioDisponible,
} from '../negocios/negocio.validacion';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const PASO_SUGERENCIAS = 15;

export function validarFecha(valor: unknown): ErrorCampo | null {
  const valida =
    typeof valor === 'string' &&
    FECHA.test(valor) &&
    !Number.isNaN(Date.parse(`${valor}T00:00:00Z`)) &&
    new Date(`${valor}T00:00:00Z`).toISOString().startsWith(valor);
  return valida
    ? null
    : { campo: 'fecha', mensaje: 'Elegí la fecha del turno' };
}

export function validarHora(valor: unknown): ErrorCampo | null {
  return typeof valor === 'string' && HORA.test(valor)
    ? null
    : { campo: 'horaInicio', mensaje: 'Elegí el horario del turno' };
}

/** CP-S3-27: el turno ocupa desde su inicio hasta inicio + duración. */
export function rangoDelTurno(horaInicio: string, duracionMin: number): Rango {
  const inicio = aMinutos(horaInicio);
  return { inicio, fin: inicio + duracionMin };
}

/** Turno que ya ocupa la agenda (los cancelados no se incluyen). */
export interface Ocupado extends Rango {
  id: string;
}

export type MotivoNoDisponible = 'FUERA_DE_HORARIO' | 'OCUPADO';

/**
 * Valida un horario contra la atención del negocio y los turnos del día
 * (CP-S3-29 a 32). Al editar, el turno no choca consigo mismo (CP-S3-37).
 */
export function motivoNoDisponible(
  horario: HorarioDisponible,
  fecha: string,
  rango: Rango,
  ocupados: Ocupado[],
  excluirId?: string,
): MotivoNoDisponible | null {
  if (!dentroDelHorario(horario, fecha, rango)) {
    return 'FUERA_DE_HORARIO';
  }
  const choca = ocupados.some(
    (ocupado) => ocupado.id !== excluirId && seSuperponen(rango, ocupado),
  );
  return choca ? 'OCUPADO' : null;
}

/**
 * Horarios libres del mismo día más cercanos al pedido (CU 5, 5a), cada 15
 * minutos dentro de las franjas de atención. `desde` evita sugerir horas pasadas.
 */
export function sugerirHorarios(
  horario: HorarioDisponible,
  fecha: string,
  duracionMin: number,
  ocupados: Ocupado[],
  deseado: number,
  opciones: { excluirId?: string; desde?: number; cantidad?: number } = {},
): string[] {
  const { excluirId, desde = 0, cantidad = 3 } = opciones;
  const libres: number[] = [];

  for (const franja of horario[diaDeLaSemana(fecha)] ?? []) {
    const fin = aMinutos(franja.fin);
    for (
      let inicio = aMinutos(franja.inicio);
      inicio + duracionMin <= fin;
      inicio += PASO_SUGERENCIAS
    ) {
      const rango = { inicio, fin: inicio + duracionMin };
      if (
        inicio >= desde &&
        !libres.includes(inicio) &&
        motivoNoDisponible(horario, fecha, rango, ocupados, excluirId) === null
      ) {
        libres.push(inicio);
      }
    }
  }

  return libres
    .sort((a, b) => Math.abs(a - deseado) - Math.abs(b - deseado) || a - b)
    .slice(0, cantidad)
    .sort((a, b) => a - b)
    .map(aHora);
}
