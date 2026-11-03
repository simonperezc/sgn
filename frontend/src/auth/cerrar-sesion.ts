import type { AuthContextProps } from 'react-oidc-context'
import { cognito } from './config'

/**
 * Cierra la sesión (RF-14): borra los tokens del navegador y cierra la sesión
 * en Cognito. Cognito no publica un "end_session_endpoint" estándar, por eso
 * se redirige a mano a su endpoint /logout.
 */
export async function cerrarSesion(auth: AuthContextProps): Promise<void> {
  await auth.removeUser()
  const parametros = new URLSearchParams({
    client_id: cognito.clientId,
    logout_uri: cognito.urlRetorno,
  })
  window.location.href = `${cognito.dominio}/logout?${parametros.toString()}`
}
