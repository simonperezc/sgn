/**
 * Guarda el id del consentimiento aceptado mientras el usuario se registra en
 * Cognito (la página se va y vuelve), para vincularlo al crear el perfil.
 * Es solo un identificador: no contiene datos personales.
 */
const CLAVE = 'sgn.consentimientoId'

export function guardarConsentimientoPendiente(id: string): void {
  try {
    sessionStorage.setItem(CLAVE, id)
  } catch {
    // Sin almacenamiento disponible: se pedirá la cláusula al volver.
  }
}

export function leerConsentimientoPendiente(): string | undefined {
  try {
    return sessionStorage.getItem(CLAVE) ?? undefined
  } catch {
    return undefined
  }
}

export function borrarConsentimientoPendiente(): void {
  try {
    sessionStorage.removeItem(CLAVE)
  } catch {
    // Nada que borrar.
  }
}
