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
import Agenda from '../agenda/Agenda'
import { SesionVencidaError, type Perfil } from '../auth/api'
import Clientes from '../clientes/Clientes'
import FichaCliente from '../clientes/FichaCliente'
import AltaNegocio from './AltaNegocio'
import { crearNegocio, listarNegocios, type DatosNuevoNegocio, type Negocio } from './api'
import { crearNegocioDesdeBorrador } from './borrador'
import EditarNegocio from './EditarNegocio'
import PanelNegocio from './PanelNegocio'
import Servicios from './Servicios'
import type { Errores } from './validacion'
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
  /** CU 23 (10a): datos del borrador que no se pudieron registrar. */
  const [precargado, setPrecargado] = useState<{
    datos: DatosNuevoNegocio
    errores: Errores
  } | null>(null)
  /** A dónde ir desde "/" al cargar: el negocio recién creado o el alta precargada. */
  const [destino, setDestino] = useState<string | null>(null)
  const navegar = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    let cancelado = false
    // CU 23, paso 10: si el usuario configuró un negocio antes de tener cuenta,
    // se crea ahora y después se cargan todos sus negocios.
    crearNegocioDesdeBorrador(idToken)
      .then(async (resultado) => ({ resultado, lista: await listarNegocios(idToken) }))
      .then(({ resultado, lista }) => {
        if (cancelado) return
        if (resultado.tipo === 'creado') {
          setDestino(`/negocios/${resultado.negocio.id}`)
        } else if (resultado.tipo === 'rechazado') {
          setPrecargado({ datos: resultado.datos, errores: resultado.errores })
          setDestino('/negocios/nuevo')
        }
        setNegocios(lista)
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
                to={
                  destino ??
                  (negocios.length > 0 ? `/negocios/${negocios[0].id}` : '/negocios/nuevo')
                }
              />
            }
          />
          <Route
            path="/negocios/nuevo"
            element={
              <AltaNegocio
                key={precargado ? 'precargado' : 'nuevo'}
                datosIniciales={precargado?.datos}
                erroresIniciales={precargado?.errores}
                textoConfirmar="Registrar negocio"
                onSesionVencida={onSesionVencida}
                onConfirmar={async (datos) => {
                  const negocio = await crearNegocio(idToken, datos)
                  setPrecargado(null)
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
            path="/negocios/:negocioId/agenda"
            element={
              <ConNegocio negocios={negocios}>
                {(negocio) => (
                  <Agenda
                    key={negocio.id}
                    idToken={idToken}
                    negocioId={negocio.id}
                    onSesionVencida={onSesionVencida}
                  />
                )}
              </ConNegocio>
            }
          />
          <Route
            path="/negocios/:negocioId/clientes"
            element={
              <ConNegocio negocios={negocios}>
                {(negocio) => (
                  <Clientes
                    key={negocio.id}
                    idToken={idToken}
                    negocioId={negocio.id}
                    onSesionVencida={onSesionVencida}
                  />
                )}
              </ConNegocio>
            }
          />
          <Route
            path="/negocios/:negocioId/clientes/:clienteId"
            element={
              <ConNegocio negocios={negocios}>
                {(negocio) => (
                  <FichaCliente
                    key={negocio.id}
                    idToken={idToken}
                    negocioId={negocio.id}
                    onSesionVencida={onSesionVencida}
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
