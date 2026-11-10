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
  tieneFoto: boolean
}

export interface Servicio {
  id: string
  nombre: string
  duracionMin: number
}

export type DatosNegocio = Pick<
  DatosNuevoNegocio,
  'nombre' | 'contacto' | 'direccion' | 'horarioDisponible'
>

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

/** El backend rechazó la operación con un mensaje para mostrar. */
export class OperacionRechazadaError extends Error {
  readonly status: number

  constructor(status: number, mensaje: string) {
    super(mensaje)
    this.status = status
  }
}

/** Convierte una respuesta fallida en el error que corresponde mostrar. */
async function errorDe(respuesta: Response): Promise<Error> {
  if (respuesta.status === 401) {
    return new SesionVencidaError()
  }
  const cuerpo = (await respuesta.json().catch(() => ({}))) as {
    message?: unknown
    campos?: ErrorCampo[]
  }
  if (respuesta.status === 400 && cuerpo.campos) {
    return new DatosInvalidosError(cuerpo.campos)
  }
  const mensaje =
    typeof cuerpo.message === 'string' && respuesta.status < 500
      ? cuerpo.message
      : 'No pudimos completar la operación. Probá de nuevo en unos minutos.'
  return new OperacionRechazadaError(respuesta.status, mensaje)
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

export async function actualizarNegocio(
  idToken: string,
  negocioId: string,
  datos: DatosNegocio,
): Promise<Negocio> {
  const respuesta = await fetch(`${apiUrl}/negocios/${negocioId}`, {
    method: 'PATCH',
    headers: cabeceras(idToken),
    body: JSON.stringify(datos),
  })
  if (!respuesta.ok) {
    throw await errorDe(respuesta)
  }
  return (await respuesta.json()) as Negocio
}

export async function subirFoto(
  idToken: string,
  negocioId: string,
  archivo: File,
): Promise<void> {
  const formulario = new FormData()
  formulario.append('foto', archivo)
  const respuesta = await fetch(`${apiUrl}/negocios/${negocioId}/foto`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${idToken}` },
    body: formulario,
  })
  if (respuesta.status === 413) {
    throw new OperacionRechazadaError(413, 'La foto no puede superar 1 MB.')
  }
  if (!respuesta.ok) {
    throw await errorDe(respuesta)
  }
}

/** La foto requiere el token, así que no alcanza con un <img src> directo. */
export async function descargarFoto(
  idToken: string,
  negocioId: string,
): Promise<Blob> {
  const respuesta = await fetch(`${apiUrl}/negocios/${negocioId}/foto`, {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: 'no-store',
  })
  if (!respuesta.ok) {
    throw await errorDe(respuesta)
  }
  return respuesta.blob()
}

export async function listarServicios(
  idToken: string,
  negocioId: string,
): Promise<Servicio[]> {
  const respuesta = await fetch(`${apiUrl}/negocios/${negocioId}/servicios`, {
    headers: cabeceras(idToken),
  })
  if (!respuesta.ok) {
    throw await errorDe(respuesta)
  }
  return (await respuesta.json()) as Servicio[]
}

export interface DatosServicio {
  nombre: string
  duracionMin: number | null
}

export async function guardarServicio(
  idToken: string,
  negocioId: string,
  datos: DatosServicio,
  servicioId?: string,
): Promise<Servicio> {
  const ruta = `${apiUrl}/negocios/${negocioId}/servicios`
  const respuesta = await fetch(servicioId ? `${ruta}/${servicioId}` : ruta, {
    method: servicioId ? 'PATCH' : 'POST',
    headers: cabeceras(idToken),
    body: JSON.stringify(datos),
  })
  if (!respuesta.ok) {
    throw await errorDe(respuesta)
  }
  return (await respuesta.json()) as Servicio
}

export async function eliminarServicio(
  idToken: string,
  negocioId: string,
  servicioId: string,
): Promise<void> {
  const respuesta = await fetch(
    `${apiUrl}/negocios/${negocioId}/servicios/${servicioId}`,
    { method: 'DELETE', headers: cabeceras(idToken) },
  )
  if (!respuesta.ok) {
    throw await errorDe(respuesta)
  }
}
