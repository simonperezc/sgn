import { SesionVencidaError } from '../auth/api'
import { apiUrl } from '../auth/config'

export type Plantilla = 'GENERICO' | 'ODONTOLOGIA' | 'NUTRICION'

export const DIAS = [
  ['lunes', 'Lunes'],
  ['martes', 'Martes'],
  ['miercoles', 'Miércoles'],
  ['jueves', 'Jueves'],
  ['viernes', 'Viernes'],
  ['sabado', 'Sábado'],
  ['domingo', 'Domingo'],
] as const

export type DiaSemana = (typeof DIAS)[number][0]

export interface Franja {
  inicio: string
  fin: string
}

export type Horario = Partial<Record<DiaSemana, Franja[]>>

export interface Negocio {
  id: string
  nombre: string
  direccion: string | null
  contacto: string | null
  horarioDisponible: Horario | null
  plantilla: Plantilla
  paneles: string[]
}

export interface DatosNuevoNegocio {
  nombre: string
  contacto: string
  direccion: string
  horarioDisponible: Horario
  plantilla: Plantilla
}

export interface ErrorCampo {
  campo: string
  mensaje: string
}

/** El backend rechazó los datos e indica qué campos corregir (CU 1, 9a). */
export class DatosInvalidosError extends Error {
  readonly campos: ErrorCampo[]

  constructor(campos: ErrorCampo[]) {
    super('Datos inválidos')
    this.campos = campos
  }
}

function cabeceras(idToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  }
}

export async function listarNegocios(idToken: string): Promise<Negocio[]> {
  const respuesta = await fetch(`${apiUrl}/negocios`, {
    headers: cabeceras(idToken),
  })
  if (respuesta.status === 401) {
    throw new SesionVencidaError()
  }
  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status} al listar los negocios`)
  }
  return (await respuesta.json()) as Negocio[]
}

export async function crearNegocio(
  idToken: string,
  datos: DatosNuevoNegocio,
): Promise<Negocio> {
  const respuesta = await fetch(`${apiUrl}/negocios`, {
    method: 'POST',
    headers: cabeceras(idToken),
    body: JSON.stringify(datos),
  })
  if (respuesta.status === 401) {
    throw new SesionVencidaError()
  }
  if (respuesta.status === 400) {
    const cuerpo = (await respuesta.json()) as { campos?: ErrorCampo[] }
    throw new DatosInvalidosError(cuerpo.campos ?? [])
  }
  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status} al crear el negocio`)
  }
  return (await respuesta.json()) as Negocio
}
