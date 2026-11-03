import { apiUrl } from './config'

export interface Perfil {
  id: string
  nombre: string
  correo: string
  rol: string
}

export interface PoliticaPrivacidad {
  id: string
  version: string
  texto: string
}

/** El backend rechazó el token (vencido o inválido): hay que volver a iniciar sesión. */
export class SesionVencidaError extends Error {}

/** El usuario todavía no aceptó la cláusula de consentimiento (RF-79). */
export class ConsentimientoRequeridoError extends Error {}

/**
 * Obtiene el perfil local; el backend lo crea en el primer ingreso (RF-83)
 * si recibe un consentimiento aceptado.
 */
export async function sincronizarPerfil(
  idToken: string,
  consentimientoId?: string,
): Promise<Perfil> {
  const respuesta = await fetch(`${apiUrl}/auth/perfil`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(consentimientoId ? { consentimientoId } : {}),
  })
  if (respuesta.status === 401) {
    throw new SesionVencidaError()
  }
  if (respuesta.status === 403) {
    throw new ConsentimientoRequeridoError()
  }
  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status} al obtener el perfil`)
  }
  return (await respuesta.json()) as Perfil
}

export async function obtenerPoliticaVigente(): Promise<PoliticaPrivacidad> {
  const respuesta = await fetch(`${apiUrl}/consentimiento/politica-vigente`)
  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status} al obtener la política`)
  }
  return (await respuesta.json()) as PoliticaPrivacidad
}

/** Registra la aceptación de la versión que el usuario vio (RF-80); devuelve su id. */
export async function aceptarConsentimiento(politicaId: string): Promise<string> {
  const respuesta = await fetch(`${apiUrl}/consentimiento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ politicaId }),
  })
  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status} al registrar el consentimiento`)
  }
  return ((await respuesta.json()) as { id: string }).id
}
