import { apiUrl } from './config'

export interface Perfil {
  id: string
  nombre: string
  correo: string
  rol: string
}

/** El backend rechazó el token (vencido o inválido): hay que volver a iniciar sesión. */
export class SesionVencidaError extends Error {}

/** Obtiene el perfil local; el backend lo crea en el primer ingreso (RF-83). */
export async function obtenerPerfil(idToken: string): Promise<Perfil> {
  const respuesta = await fetch(`${apiUrl}/auth/perfil`, {
    headers: { Authorization: `Bearer ${idToken}` },
  })
  if (respuesta.status === 401) {
    throw new SesionVencidaError()
  }
  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status} al obtener el perfil`)
  }
  return (await respuesta.json()) as Perfil
}
