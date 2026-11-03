import { useEffect, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import {
  ConsentimientoRequeridoError,
  SesionVencidaError,
  sincronizarPerfil,
  type Perfil,
} from './auth/api'
import { cerrarSesion } from './auth/cerrar-sesion'
import ClausulaConsentimiento from './consentimiento/ClausulaConsentimiento'
import {
  borrarConsentimientoPendiente,
  guardarConsentimientoPendiente,
  leerConsentimientoPendiente,
} from './consentimiento/pendiente'

const AVISO_RECHAZO =
  'No podés crear una cuenta sin aceptar la cláusula de consentimiento. No se guardó ningún dato tuyo.'

export default function App() {
  const auth = useAuth()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  /** Mostrar la cláusula antes de registrarse (sin sesión) o al primer ingreso. */
  const [mostrarClausula, setMostrarClausula] = useState(false)

  /** Consentimiento a vincular al crear el perfil (pendiente si se volvió de Cognito). */
  const [consentimientoId, setConsentimientoId] = useState<string | undefined>(
    leerConsentimientoPendiente,
  )

  const idToken = auth.user?.id_token

  useEffect(() => {
    if (auth.error) console.error('[auth]', auth.error)
  }, [auth.error])

  useEffect(() => {
    if (!idToken) return
    let cancelado = false
    sincronizarPerfil(idToken, consentimientoId)
      .then((datos) => {
        if (cancelado) return
        borrarConsentimientoPendiente()
        setPerfil(datos)
        setMostrarClausula(false)
      })
      .catch(async (error: unknown) => {
        if (cancelado) return
        if (error instanceof ConsentimientoRequeridoError) {
          // Se registró sin pasar por nuestra cláusula: se pide antes de seguir.
          borrarConsentimientoPendiente()
          setMostrarClausula(true)
        } else if (error instanceof SesionVencidaError) {
          // CP-S2-22: token rechazado por el backend → pedir iniciar sesión de nuevo.
          await auth.removeUser()
          setAviso('Tu sesión venció. Iniciá sesión nuevamente.')
        } else {
          setAviso('No pudimos cargar tu perfil. Probá de nuevo en unos minutos.')
        }
      })
    return () => {
      cancelado = true
    }
  }, [idToken, consentimientoId, auth])

  if (auth.isLoading) {
    return <p>Cargando…</p>
  }

  if (auth.error) {
    // RNF-31: sin detalles técnicos y sin conceder acceso. Puede ser Cognito
    // caído o una sesión guardada en el navegador que no se puede leer.
    return (
      <main>
        <p>No pudimos conectar con el inicio de sesión. Volvé a intentarlo en unos minutos.</p>
        <button
          onClick={() => {
            void auth.removeUser().then(() => auth.signinRedirect())
          }}
        >
          Reintentar
        </button>
      </main>
    )
  }

  if (!auth.isAuthenticated) {
    if (mostrarClausula) {
      // CU 1, paso 2: cláusula antes de ir al registro de Cognito.
      return (
        <main>
          <ClausulaConsentimiento
            onAceptado={(consentimientoId) => {
              guardarConsentimientoPendiente(consentimientoId)
              void auth.signinRedirect()
            }}
            onRechazar={() => {
              setMostrarClausula(false)
              setAviso(AVISO_RECHAZO)
            }}
          />
        </main>
      )
    }
    return (
      <main>
        <h1>Sistema de gestión de negocios</h1>
        {aviso && <p role="alert">{aviso}</p>}
        <button onClick={() => void auth.signinRedirect()}>Iniciar sesión</button>{' '}
        <button
          onClick={() => {
            setAviso(null)
            setMostrarClausula(true)
          }}
        >
          Crear cuenta
        </button>
      </main>
    )
  }

  if (mostrarClausula) {
    // Primer ingreso sin consentimiento: no se crea el perfil hasta aceptar.
    return (
      <main>
        <ClausulaConsentimiento
          onAceptado={setConsentimientoId}
          onRechazar={() => {
            setMostrarClausula(false)
            void auth.removeUser().then(() => setAviso(AVISO_RECHAZO))
          }}
        />
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