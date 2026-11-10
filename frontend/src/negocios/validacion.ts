import type { Horario } from './api'

export type Errores = Record<string, string>

/** Devuelve los errores de nombre y horario del negocio (RF-17). */
export function validarDatos(nombre: string, horario: Horario): Errores {
  const errores: Errores = {}
  if (nombre.trim() === '') {
    errores.nombre = 'Ingresá el nombre del negocio'
  }
  const franjas = Object.values(horario).flat()
  if (franjas.length === 0) {
    errores.horarioDisponible = 'Definí el horario disponible del negocio'
  } else if (franjas.some((franja) => !franja.inicio || !franja.fin)) {
    errores.horarioDisponible = 'Completá las horas de inicio y fin de cada franja'
  } else if (franjas.some((franja) => franja.fin <= franja.inicio)) {
    errores.horarioDisponible = 'La hora de fin debe ser posterior a la de inicio'
  }
  return errores
}
