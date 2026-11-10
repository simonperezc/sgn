import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { SesionVencidaError } from '../auth/api'
import { listarServicios, OperacionRechazadaError, type Servicio } from '../negocios/api'
import { cancelarTurno, listarTurnos, type Turno } from './api'
import { fechaLarga, hoy, sumarDias } from './fechas'
import TurnoForm from './TurnoForm'

interface Props {
  idToken: string
  negocioId: string
  onSesionVencida: () => void
}

type Modo = { tipo: 'nuevo' } | { tipo: 'editar'; turno: Turno } | null

const ERROR_GENERAL = 'No pudimos cargar la agenda. Probá de nuevo en unos minutos.'

/** Agenda diaria del negocio: alta, edición y cancelación (CU 5 y 6). */
export default function Agenda({ idToken, negocioId, onSesionVencida }: Props) {
  const [fecha, setFecha] = useState(hoy())
  const [turnos, setTurnos] = useState<Turno[] | null>(null)
  const [servicios, setServicios] = useState<Servicio[] | null>(null)
  const [modo, setModo] = useState<Modo>(null)
  const [aCancelar, setACancelar] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelado = false
    Promise.all([listarTurnos(idToken, negocioId, fecha), listarServicios(idToken, negocioId)])
      .then(([delDia, ofrecidos]) => {
        if (cancelado) return
        setTurnos(delDia)
        setServicios(ofrecidos)
      })
      .catch((causa: unknown) => {
        if (cancelado) return
        if (causa instanceof SesionVencidaError) {
          onSesionVencida()
        } else {
          setError(ERROR_GENERAL)
        }
      })
    return () => {
      cancelado = true
    }
  }, [idToken, negocioId, fecha, version, onSesionVencida])

  async function cancelar(turnoId: string) {
    setError(null)
    try {
      await cancelarTurno(idToken, negocioId, turnoId)
      setACancelar(null)
      setVersion((v) => v + 1)
    } catch (causa) {
      if (causa instanceof SesionVencidaError) {
        onSesionVencida()
      } else {
        setError(
          causa instanceof OperacionRechazadaError
            ? causa.message
            : 'No pudimos cancelar el turno. Probá de nuevo en unos minutos.',
        )
      }
    }
  }

  const sinServicios = servicios !== null && servicios.length === 0

  return (
    <section>
      <h2>Agenda</h2>
      <p>
        <Link to={`/negocios/${negocioId}`}>Volver al panel</Link>
      </p>

      <div className="navegacion-dia">
        <button aria-label="Día anterior" onClick={() => setFecha(sumarDias(fecha, -1))}>
          ←
        </button>
        <input
          type="date"
          aria-label="Fecha de la agenda"
          value={fecha}
          onChange={(e) => e.target.value && setFecha(e.target.value)}
        />
        <button aria-label="Día siguiente" onClick={() => setFecha(sumarDias(fecha, 1))}>
          →
        </button>
      </div>
      <p className="fecha-larga">{fechaLarga(fecha)}</p>

      {error && <p role="alert" className="error">{error}</p>}

      {sinServicios && (
        <p className="aviso">
          Para agendar turnos, primero{' '}
          <Link to={`/negocios/${negocioId}/servicios`}>registrá un servicio</Link>.
        </p>
      )}

      {modo && servicios ? (
        <TurnoForm
          key={modo.tipo === 'editar' ? modo.turno.id : 'nuevo'}
          idToken={idToken}
          negocioId={negocioId}
          servicios={servicios}
          turno={modo.tipo === 'editar' ? modo.turno : undefined}
          fechaInicial={fecha}
          onSesionVencida={onSesionVencida}
          onCerrar={() => setModo(null)}
          onGuardado={(guardado) => {
            setModo(null)
            setFecha(guardado.fecha)
            setVersion((v) => v + 1)
          }}
        />
      ) : (
        !sinServicios && (
          <button className="boton-principal" onClick={() => setModo({ tipo: 'nuevo' })}>
            Nuevo turno
          </button>
        )
      )}

      {turnos && turnos.length === 0 && <p>No hay turnos para este día.</p>}
      <ul className="lista">
        {turnos?.map((turno) => {
          const cancelado = turno.estado === 'CANCELADO'
          return (
            <li key={turno.id} className={cancelado ? 'turno-cancelado' : undefined}>
              <span>
                <strong>
                  {turno.horaInicio}–{turno.horaFin}
                </strong>{' '}
                · {turno.cliente.nombre} · {turno.servicio.nombre}
                {cancelado && <span className="etiqueta"> Cancelado</span>}
              </span>
              {!cancelado &&
                (aCancelar === turno.id ? (
                  <span className="acciones">
                    ¿Cancelar este turno?
                    <button onClick={() => void cancelar(turno.id)}>Sí, cancelar</button>
                    <button onClick={() => setACancelar(null)}>No</button>
                  </span>
                ) : (
                  <span className="acciones">
                    <button onClick={() => setModo({ tipo: 'editar', turno })}>Editar</button>
                    <button onClick={() => setACancelar(turno.id)}>Cancelar</button>
                  </span>
                ))}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
