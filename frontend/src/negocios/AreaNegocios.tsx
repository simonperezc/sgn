import { useEffect, useState, type ReactNode } from 'react'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router'
import { SesionVencidaError, type Perfil } from '../auth/api'
import AltaNegocio from './AltaNegocio'
import { listarNegocios, type Negocio } from './api'
import EditarNegocio from './EditarNegocio'
import PanelNegocio from './PanelNegocio'
import Servicios from './Servicios'
import './negocios.css'

interface Props {
  idToken: string
  perfil: Perfil
  onSesionVencida: () => void
  onCerrarSesion: () => void
}

/** Resuelve el negocio de la ruta entre los negocios del usuario. */
function ConNegocio({
  negocios,
  children,
}: {
  negocios: Negocio[]
  children: (negocio: Negocio) => ReactNode
}) {
  const { negocioId } = useParams()
  const negocio = negocios.find((n) => n.id === negocioId)
  if (!negocio) {
    return (
      <p role="alert">
        No encontramos ese negocio. <Link to="/">Volver al inicio</Link>
      </p>
    )
  }
  return children(negocio)
}

/** Área privada: alta de negocios, selector del negocio activo y paneles. */
export default function AreaNegocios({
  idToken,
  perfil,
  onSesionVencida,
  onCerrarSesion,
}: Props) {
  const [negocios, setNegocios] = useState<Negocio[] | null>(null)
  const [fallo, setFallo] = useState(false)
  const navegar = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    let cancelado = false
    listarNegocios(idToken)
      .then((datos) => {
        if (!cancelado) setNegocios(datos)
      })
      .catch((error: unknown) => {
        if (cancelado) return
        if (error instanceof SesionVencidaError) {
          onSesionVencida()
        } else {
          setFallo(true)
        }
      })
    return () => {
      cancelado = true
    }
  }, [idToken, onSesionVencida])

  const idActivo = /^\/negocios\/([^/]+)/.exec(pathname)?.[1]
  const activo = negocios?.find((n) => n.id === idActivo)

  return (
    <main className="area">
      <header className="area-cabecera">
        <span>Hola, {perfil.nombre}</span>
        <button onClick={onCerrarSesion}>Cerrar sesión</button>
      </header>

      {negocios && negocios.length > 0 && (
        <nav className="selector">
          <label>
            Negocio activo
            <select
              value={activo?.id ?? ''}
              onChange={(evento) => void navegar(`/negocios/${evento.target.value}`)}
            >
              {!activo && <option value="">Seleccioná un negocio</option>}
              {negocios.map((negocio) => (
                <option key={negocio.id} value={negocio.id}>
                  {negocio.nombre}
                </option>
              ))}
            </select>
          </label>
          <Link to="/negocios/nuevo">Registrar otro negocio</Link>
        </nav>
      )}

      {fallo && (
        <p role="alert">No pudimos cargar tus negocios. Probá de nuevo en unos minutos.</p>
      )}
      {!fallo && !negocios && <p>Cargando tus negocios…</p>}
      {negocios && (
        <Routes>
          <Route
            path="/"
            element={
              <Navigate
                replace
                to={negocios.length > 0 ? `/negocios/${negocios[0].id}` : '/negocios/nuevo'}
              />
            }
          />
          <Route
            path="/negocios/nuevo"
            element={
              <AltaNegocio
                idToken={idToken}
                onSesionVencida={onSesionVencida}
                onCreado={(negocio) => {
                  setNegocios([...negocios, negocio])
                  void navegar(`/negocios/${negocio.id}`)
                }}
              />
            }
          />
          <Route
            path="/negocios/:negocioId"
            element={
              <ConNegocio negocios={negocios}>
                {(negocio) => <PanelNegocio idToken={idToken} negocio={negocio} />}
              </ConNegocio>
            }
          />
          <Route
            path="/negocios/:negocioId/datos"
            element={
              <ConNegocio negocios={negocios}>
                {(negocio) => (
                  <EditarNegocio
                    key={negocio.id}
                    idToken={idToken}
                    negocio={negocio}
                    onSesionVencida={onSesionVencida}
                    onGuardado={(guardado) => {
                      setNegocios(
                        negocios.map((n) => (n.id === guardado.id ? guardado : n)),
                      )
                      void navegar(`/negocios/${guardado.id}`)
                    }}
                  />
                )}
              </ConNegocio>
            }
          />
          <Route
            path="/negocios/:negocioId/servicios"
            element={
              <ConNegocio negocios={negocios}>
                {(negocio) => (
                  <Servicios
                    key={negocio.id}
                    idToken={idToken}
                    negocioId={negocio.id}
                    onSesionVencida={onSesionVencida}
                  />
                )}
              </ConNegocio>
            }
          />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      )}
    </main>
  )
}
