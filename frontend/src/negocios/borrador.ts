import { SesionVencidaError } from '../auth/api'
import {
  crearNegocio,
  DatosInvalidosError,
  type DatosNuevoNegocio,
  type Negocio,
  type Plantilla,
} from './api'
import type { Errores } from './validacion'

/**
 * Negocio que un visitante configuró antes de tener cuenta (CU 23, RF-93).
 * Se guarda solo en el navegador mientras se registra en Cognito (la página se
 * va y vuelve) y no se envía al servidor hasta que tenga sesión.
 */
const CLAVE = 'sgn.borradorNegocio'
const PLANTILLAS: Plantilla[] = ['ODONTOLOGIA', 'NUTRICION', 'GENERICO']

export function guardarBorrador(datos: DatosNuevoNegocio): void {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(datos))
  } catch {
    // Sin almacenamiento: al volver se pedirán los datos de nuevo.
  }
}

/** Devuelve el borrador si existe y tiene la forma esperada; si no, lo descarta. */
export function leerBorrador(): DatosNuevoNegocio | null {
  let texto: string | null
  try {
    texto = sessionStorage.getItem(CLAVE)
  } catch {
    return null
  }
  if (!texto) return null
  try {
    const datos = JSON.parse(texto) as Partial<DatosNuevoNegocio>
    const esTexto = (valor: unknown) => typeof valor === 'string'
    if (
      esTexto(datos.nombre) &&
      esTexto(datos.contacto) &&
      esTexto(datos.direccion) &&
      PLANTILLAS.includes(datos.plantilla as Plantilla) &&
      typeof datos.horarioDisponible === 'object' &&
      datos.horarioDisponible !== null
    ) {
      return datos as DatosNuevoNegocio
    }
  } catch {
    // JSON ilegible: se descarta abajo.
  }
  borrarBorrador()
  return null
}

export function borrarBorrador(): void {
  try {
    sessionStorage.removeItem(CLAVE)
  } catch {
    // Nada que borrar.
  }
}

export type ResultadoBorrador =
  | { tipo: 'sin-borrador' }
  | { tipo: 'creado'; negocio: Negocio }
  /** CU 23 (10a): no se pudo crear; se precargan los datos en el formulario. */
  | { tipo: 'rechazado'; datos: DatosNuevoNegocio; errores: Errores }

let enCurso: Promise<ResultadoBorrador> | null = null

/**
 * Crea el negocio del borrador al tener sesión (CU 23, paso 10). El borrador se
 * quita antes de enviarlo y la operación en curso se comparte, para que una
 * recarga o un efecto repetido no creen el negocio dos veces (CP-S3-66).
 */
export function crearNegocioDesdeBorrador(idToken: string): Promise<ResultadoBorrador> {
  if (enCurso) return enCurso
  const datos = leerBorrador()
  if (!datos) return Promise.resolve({ tipo: 'sin-borrador' })

  borrarBorrador()
  enCurso = crearNegocio(idToken, datos)
    .then((negocio): ResultadoBorrador => ({ tipo: 'creado', negocio }))
    .catch((error: unknown): ResultadoBorrador => {
      if (error instanceof SesionVencidaError) {
        // Se conserva para crearlo después de volver a iniciar sesión.
        guardarBorrador(datos)
        throw error
      }
      const errores: Errores =
        error instanceof DatosInvalidosError
          ? Object.fromEntries(error.campos.map((c) => [c.campo, c.mensaje]))
          : { general: 'No pudimos registrar el negocio. Revisá los datos y probá de nuevo.' }
      return { tipo: 'rechazado', datos, errores }
    })
    .finally(() => {
      enCurso = null
    })
  return enCurso
}
