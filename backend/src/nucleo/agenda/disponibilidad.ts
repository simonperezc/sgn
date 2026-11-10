import type { EntityManager } from 'typeorm';
import { DIAS_SEMANA, HorarioDisponible } from '../negocios/negocio.validacion';

/** Rango en minutos desde las 00:00 del día. */
export interface Rango {
  inicio: number;
  fin: number;
}

/** Convierte "HH:MM" o "HH:MM:SS" (como devuelve PostgreSQL) a minutos. */
export function aMinutos(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

export function aHora(minutos: number): string {
  const horas = String(Math.floor(minutos / 60)).padStart(2, '0');
  return `${horas}:${String(minutos % 60).padStart(2, '0')}`;
}

/** El fin es exclusivo: un turno puede empezar justo cuando termina otro. */
export function seSuperponen(a: Rango, b: Rango): boolean {
  return a.inicio < b.fin && b.inicio < a.fin;
}

/** Día de la semana de una fecha "AAAA-MM-DD", sin depender de la zona horaria. */
export function diaDeLaSemana(fecha: string): (typeof DIAS_SEMANA)[number] {
  const domingoPrimero = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return DIAS_SEMANA[(domingoPrimero + 6) % 7];
}

/** El turno completo debe entrar en una franja de atención de ese día. */
export function dentroDelHorario(
  horario: HorarioDisponible,
  fecha: string,
  rango: Rango,
): boolean {
  return (horario[diaDeLaSemana(fecha)] ?? []).some(
    (franja) =>
      rango.inicio >= aMinutos(franja.inicio) &&
      rango.fin <= aMinutos(franja.fin),
  );
}

/** Fecha y hora actuales en Uruguay, donde está la agenda de los negocios. */
export function ahoraEnUruguay(ahora = new Date()): {
  fecha: string;
  hora: string;
} {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Montevideo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(ahora);
  const valor = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';
  return {
    fecha: `${valor('year')}-${valor('month')}-${valor('day')}`,
    hora: `${valor('hour')}:${valor('minute')}`,
  };
}

/**
 * Serializa los cambios de la agenda por negocio y fecha hasta el fin de la
 * transacción, para que dos operaciones simultáneas no ocupen el mismo horario.
 * Las fechas se bloquean en orden para evitar interbloqueos.
 */
export async function bloquearFechas(
  em: EntityManager,
  negocioId: string,
  fechas: string[],
): Promise<void> {
  for (const fecha of [...new Set(fechas)].sort()) {
    await em.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `agenda:${negocioId}:${fecha}`,
    ]);
  }
}
