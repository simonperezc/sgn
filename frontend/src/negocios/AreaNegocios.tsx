import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { SesionVencidaError, type Perfil } from '../auth/api'
import AltaNegocio from './AltaNegocio'
import { listarNegocios, type Negocio } from './api'
import PanelNegocio from './PanelNegocio'
import './negocios.css'

interface Props {
  idToken: string
  perfil: Perfil
  onSesionVencida: () => void
  onCerrarSesion: () => void
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

  const activo = negocios?.find((n) => pathname === `/negocios/${n.id}`)

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
          <Route path="/negocios/:negocioId" element={<PanelNegocio negocios={negocios} />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      )}
    </main>
  )
}
