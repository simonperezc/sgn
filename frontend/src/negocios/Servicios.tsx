import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { SesionVencidaError } from '../auth/api'
import {
  DatosInvalidosError,
  eliminarServicio,
  guardarServicio,
  listarServicios,
  OperacionRechazadaError,
  type Servicio,
} from './api'
import type { Errores } from './validacion'

interface Props {
  idToken: string
  negocioId: string
  onSesionVencida: () => void
}

const ERROR_GENERAL = 'No pudimos completar la operación. Probá de nuevo en unos minutos.'

/** CU 4, pasos 3 a 5: alta, edición y eliminación de servicios (RF-19). */
export default function Servicios({ idToken, negocioId, onSesionVencida }: Props) {
  const [servicios, setServicios] = useState<Servicio[] | null>(null)
  const [editando, setEditando] = useState<Servicio | null>(null)
  const [nombre, setNombre] = useState('')
  const [duracion, setDuracion] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [aEliminar, setAEliminar] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    listarServicios(idToken, negocioId)
      .then((datos) => {
        if (!cancelado) setServicios(datos)
      })
      .catch((error: unknown) => {
        if (cancelado) return
        if (error instanceof SesionVencidaError) {
          onSesionVencida()
        } else {
          setErrores({ general: ERROR_GENERAL })
        }
      })
    return () => {
      cancelado = true
    }
  }, [idToken, negocioId, onSesionVencida])

  function mostrarError(error: unknown) {
    if (error instanceof SesionVencidaError) {
      onSesionVencida()
    } else if (error instanceof DatosInvalidosError) {
      setErrores(Object.fromEntries(error.campos.map((c) => [c.campo, c.mensaje])))
    } else if (error instanceof OperacionRechazadaError) {
      setErrores({ general: error.message })
    } else {
      setErrores({ general: ERROR_GENERAL })
    }
  }

  function limpiar() {
    setEditando(null)
    setNombre('')
    setDuracion('')
    setErrores({})
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    setErrores({})
    try {
      const guardado = await guardarServicio(
        idToken,
        negocioId,
        { nombre, duracionMin: duracion === '' ? null : Number(duracion) },
        editando?.id,
      )
      setServicios((actuales) =>
        [...(actuales ?? []).filter((s) => s.id !== guardado.id), guardado].sort((a, b) =>
          a.nombre.localeCompare(b.nombre),
        ),
      )
      limpiar()
    } catch (error) {
      mostrarError(error)
    }
  }

  async function eliminar(id: string) {
    setErrores({})
    try {
      await eliminarServicio(idToken, negocioId, id)
      setServicios((actuales) => (actuales ?? []).filter((s) => s.id !== id))
      setAEliminar(null)
      if (editando?.id === id) limpiar()
    } catch (error) {
      mostrarError(error)
    }
  }

  return (
    <section>
      <h2>Servicios</h2>
      <p>
        <Link to={`/negocios/${negocioId}`}>Volver al panel</Link>
      </p>

      <form className="formulario" onSubmit={(e) => void guardar(e)} noValidate>
        <h3>{editando ? `Editar ${editando.nombre}` : 'Nuevo servicio'}</h3>
        <label>
          Nombre *
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          {errores.nombre && <span role="alert" className="error">{errores.nombre}</span>}
        </label>
        <label>
          Duración (minutos) *
          <input
            type="number"
            min="1"
            step="1"
            value={duracion}
            onChange={(e) => setDuracion(e.target.value)}
          />
          {errores.duracionMin && (
            <span role="alert" className="error">{errores.duracionMin}</span>
          )}
        </label>
        {errores.general && <span role="alert" className="error">{errores.general}</span>}
        <div className="acciones">
          <button type="submit">{editando ? 'Guardar cambios' : 'Agregar servicio'}</button>
          {editando && (
            <button type="button" onClick={limpiar}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {servicios && servicios.length === 0 && <p>Todavía no registraste servicios.</p>}
      <ul className="lista">
        {servicios?.map((servicio) => (
          <li key={servicio.id}>
            <span>
              <strong>{servicio.nombre}</strong> · {servicio.duracionMin} min
            </span>
            {aEliminar === servicio.id ? (
              <span className="acciones">
                ¿Eliminar este servicio?
                <button onClick={() => void eliminar(servicio.id)}>Sí, eliminar</button>
                <button onClick={() => setAEliminar(null)}>No</button>
              </span>
            ) : (
              <span className="acciones">
                <button
                  onClick={() => {
                    setEditando(servicio)
                    setNombre(servicio.nombre)
                    setDuracion(String(servicio.duracionMin))
                    setErrores({})
                  }}
                >
                  Editar
                </button>
                <button onClick={() => setAEliminar(servicio.id)}>Eliminar</button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
