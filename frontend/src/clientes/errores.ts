import { SesionVencidaError } from '../auth/api'
import { DatosInvalidosError, OperacionRechazadaError } from '../negocios/api'
import type { Errores } from '../negocios/validacion'

/** Cliente con el mismo teléfono que informa el backend (CU 11, 2a). */
export interface ClienteExistente {
  id: string
  nombre: string
}

export interface ErrorCliente {
  errores: Errores
  existente: ClienteExistente | null
}

const ERROR_GENERAL = 'No pudimos guardar el cliente. Probá de nuevo en unos minutos.'

/** Traduce un error del backend a mensajes por campo; null si la sesión venció. */
export function leerErrorCliente(error: unknown): ErrorCliente | null {
  if (error instanceof SesionVencidaError) {
    return null
  }
  if (error instanceof DatosInvalidosError) {
    return {
      errores: Object.fromEntries(error.campos.map((c) => [c.campo, c.mensaje])),
      existente: null,
    }
  }
  if (error instanceof OperacionRechazadaError) {
    const existente = error.detalle.clienteExistente as ClienteExistente | undefined
    return {
      errores: existente ? { telefono: error.message } : { general: error.message },
      existente: existente ?? null,
    }
  }
  return { errores: { general: ERROR_GENERAL }, existente: null }
}
