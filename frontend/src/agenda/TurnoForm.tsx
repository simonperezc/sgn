import { useState, type FormEvent } from 'react'
import { SesionVencidaError } from '../auth/api'
import {
  DatosInvalidosError,
  OperacionRechazadaError,
  type Servicio,
} from '../negocios/api'
import type { Errores } from '../negocios/validacion'
import {
  buscarClientePorTelefono,
  guardarTurno,
  type ClienteResumen,
  type DatosTurno,
  type Turno,
} from './api'

interface Props {
  idToken: string
  negocioId: string
  servicios: Servicio[]
  /** Si viene, se edita ese turno; si no, es un turno nuevo. */
  turno?: Turno
  fechaInicial: string
  onGuardado: (turno: Turno) => void
  onCerrar: () => void
  onSesionVencida: () => void
}

type Busqueda =
  | { estado: 'pendiente' }
  | { estado: 'encontrado'; cliente: ClienteResumen }
  | { estado: 'nuevo' }

const ERROR_GENERAL = 'No pudimos guardar el turno. Probá de nuevo en unos minutos.'

/** CU 5 (alta) y CU 6 (edición) de turnos manuales. */
export default function TurnoForm({
  idToken,
  negocioId,
  servicios,
  turno,
  fechaInicial,
  onGuardado,
  onCerrar,
  onSesionVencida,
}: Props) {
  const [telefono, setTelefono] = useState('')
  const [busqueda, setBusqueda] = useState<Busqueda>({ estado: 'pendiente' })
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [servicioId, setServicioId] = useState(turno?.servicio.id ?? '')
  const [fecha, setFecha] = useState(turno?.fecha ?? fechaInicial)
  const [hora, setHora] = useState(turno?.horaInicio ?? '')
  const [errores, setErrores] = useState<Errores>({})
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  function mostrarError(error: unknown) {
    setSugerencias([])
    if (error instanceof SesionVencidaError) {
      onSesionVencida()
    } else if (error instanceof DatosInvalidosError) {
      setErrores(Object.fromEntries(error.campos.map((c) => [c.campo, c.mensaje])))
    } else if (error instanceof OperacionRechazadaError) {
      setErrores({ general: error.message })
      const sugeridas = error.detalle.sugerencias
      if (Array.isArray(sugeridas)) {
        setSugerencias(sugeridas.filter((h): h is string => typeof h === 'string'))
      }
    } else {
      setErrores({ general: ERROR_GENERAL })
    }
  }

  async function buscar() {
    setErrores({})
    try {
      const cliente = await buscarClientePorTelefono(idToken, negocioId, telefono)
      setBusqueda(cliente ? { estado: 'encontrado', cliente } : { estado: 'nuevo' })
    } catch (error) {
      mostrarError(error)
    }
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (!turno && busqueda.estado === 'pendiente') {
      setErrores({ telefono: 'Ingresá el teléfono del cliente y tocá Buscar' })
      return
    }

    const datos: Partial<DatosTurno> = {
      servicioId: servicioId || null,
      fecha,
      horaInicio: hora,
    }
    if (busqueda.estado === 'encontrado') {
      datos.clienteId = busqueda.cliente.id
    } else if (busqueda.estado === 'nuevo') {
      datos.clienteNuevo = { nombre: nombreNuevo, telefono }
    }

    setErrores({})
    setSugerencias([])
    setEnviando(true)
    try {
      onGuardado(await guardarTurno(idToken, negocioId, datos, turno?.id))
    } catch (error) {
      mostrarError(error)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={(e) => void guardar(e)} noValidate>
      <h3>{turno ? 'Editar turno' : 'Nuevo turno'}</h3>

      {turno ? (
        <p>
          Cliente: <strong>{turno.cliente.nombre}</strong> ({turno.cliente.telefono})
        </p>
      ) : (
        <fieldset>
          <legend>Cliente *</legend>
          <label>
            Teléfono
            <span className="fila-busqueda">
              <input
                type="tel"
                value={telefono}
                onChange={(e) => {
                  setTelefono(e.target.value)
                  setBusqueda({ estado: 'pendiente' })
                }}
              />
              <button type="button" onClick={() => void buscar()} disabled={!telefono.trim()}>
                Buscar
              </button>
            </span>
          </label>
          {busqueda.estado === 'encontrado' && (
            <p className="aviso">
              Cliente: <strong>{busqueda.cliente.nombre}</strong> ({busqueda.cliente.telefono})
            </p>
          )}
          {busqueda.estado === 'nuevo' && (
            <>
              <p className="aviso">No hay un cliente con ese teléfono. Registralo ahora:</p>
              <label>
                Nombre del cliente
                <input value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} />
              </label>
              {errores.clienteNombre && (
                <span role="alert" className="error">{errores.clienteNombre}</span>
              )}
            </>
          )}
          {errores.telefono && <span role="alert" className="error">{errores.telefono}</span>}
          {errores.cliente && <span role="alert" className="error">{errores.cliente}</span>}
        </fieldset>
      )}

      <label>
        Servicio *
        <select value={servicioId} onChange={(e) => setServicioId(e.target.value)}>
          <option value="">Elegí un servicio</option>
          {servicios.map((servicio) => (
            <option key={servicio.id} value={servicio.id}>
              {servicio.nombre} ({servicio.duracionMin} min)
            </option>
          ))}
          {turno && !servicios.some((s) => s.id === turno.servicio.id) && (
            <option value={turno.servicio.id}>{turno.servicio.nombre}</option>
          )}
        </select>
        {errores.servicioId && <span role="alert" className="error">{errores.servicioId}</span>}
      </label>
      <label>
        Fecha *
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        {errores.fecha && <span role="alert" className="error">{errores.fecha}</span>}
      </label>
      <label>
        Hora de inicio *
        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        {errores.horaInicio && <span role="alert" className="error">{errores.horaInicio}</span>}
      </label>

      {errores.general && <span role="alert" className="error">{errores.general}</span>}
      {sugerencias.length > 0 && (
        <div className="sugerencias">
          <span>Horarios disponibles más cercanos:</span>
          {sugerencias.map((sugerida) => (
            <button
              type="button"
              key={sugerida}
              onClick={() => {
                setHora(sugerida)
                setSugerencias([])
                setErrores({})
              }}
            >
              {sugerida}
            </button>
          ))}
        </div>
      )}

      <div className="acciones">
        <button type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : turno ? 'Guardar cambios' : 'Crear turno'}
        </button>
        <button type="button" onClick={onCerrar} disabled={enviando}>
          Descartar
        </button>
      </div>
    </form>
  )
}
