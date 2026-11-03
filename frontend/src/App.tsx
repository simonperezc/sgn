import { useEffect, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { obtenerPerfil, SesionVencidaError, type Perfil } from './auth/api'
import { cerrarSesion } from './auth/cerrar-sesion'

export default function App() {
  const auth = useAuth()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const idToken = auth.user?.id_token

  useEffect(() => {
    if (!idToken) return
    obtenerPerfil(idToken)
      .then(setPerfil)
      .catch(async (error: unknown) => {
        if (error instanceof SesionVencidaError) {
          // CP-S2-22: token rechazado por el backend → pedir iniciar sesión de nuevo.
          await auth.removeUser()
          setAviso('Tu sesión venció. Iniciá sesión nuevamente.')
        } else {
          setAviso('No pudimos cargar tu perfil. Probá de nuevo en unos minutos.')
        }
      })
  }, [idToken, auth])

  if (auth.isLoading) {
    return <p>Cargando…</p>
  }

  if (auth.error) {
    // RNF-31: sin detalles técnicos y sin conceder acceso.
    return (
      <main>
        <p>El servicio de inicio de sesión no está disponible en este momento.</p>
        <button onClick={() => void auth.signinRedirect()}>Reintentar</button>
      </main>
    )
  }

  if (!auth.isAuthenticated) {
    return (
      <main>
        <h1>Sistema de gestión de negocios</h1>
        {aviso && <p role="alert">{aviso}</p>}
        <button onClick={() => void auth.signinRedirect()}>Iniciar sesión</button>
      </main>
    )
  }

  return (
    <main>
      <h1>Sistema de gestión de negocios</h1>
      {aviso && <p role="alert">{aviso}</p>}
      {perfil ? (
        <p>
          Hola, {perfil.nombre} ({perfil.correo})
        </p>
      ) : (
        <p>Cargando tu perfil…</p>
      )}
      <button onClick={() => void cerrarSesion(auth)}>Cerrar sesión</button>
    </main>
  )
}
