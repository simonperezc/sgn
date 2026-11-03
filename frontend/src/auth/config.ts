import type { AuthProviderProps } from 'react-oidc-context'

function leer(nombre: keyof ImportMetaEnv): string {
  const valor = import.meta.env[nombre]
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre} en frontend/.env`)
  }
  return valor
}

const region = leer('VITE_COGNITO_REGION')
const userPoolId = leer('VITE_COGNITO_USER_POOL_ID')

export const cognito = {
  clientId: leer('VITE_COGNITO_CLIENT_ID'),
  /** Dominio de la página de inicio de sesión de Cognito, sin barra final. */
  dominio: leer('VITE_COGNITO_DOMAIN'),
  /** Adónde vuelve el usuario después de iniciar o cerrar sesión. */
  urlRetorno: window.location.origin + '/',
}

export const apiUrl = leer('VITE_API_URL')

/** Configuración OIDC: código de autorización con PKCE (lo hace oidc-client-ts). */
export const oidcConfig: AuthProviderProps = {
  authority: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
  client_id: cognito.clientId,
  redirect_uri: cognito.urlRetorno,
  response_type: 'code',
  scope: 'openid email profile',
  // Al volver de Cognito, saca ?code=...&state=... de la barra de direcciones.
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname)
  },
}
