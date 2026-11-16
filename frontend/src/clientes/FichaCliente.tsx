import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { fechaLarga } from '../agenda/fechas'
import { OperacionRechazadaError } from '../negocios/api'
import type { Errores } from '../negocios/validacion'
import { actualizarCliente, obtenerFicha, type FichaCliente as Ficha } from './api'
import { leerErrorCliente, type ClienteExistente } from './errores'

interface Props {
  idToken: string
  negocioId: string
  onSesionVencida: () => void
}

const ESTADO: Record<string, string> = {
  PENDIENTE_PAGO: 'Pendiente de pago',
  CONFIRMADO: 'Confirmado',
}

const RESULTADO: Record<string, string> = {
  REALIZADO: 'Realizado',
  NO_ASISTIO: 'No asistió',
}

/** CU 11: ficha del cliente con historial (RF-43), notas y contacto (RF-44). */
export default function FichaCliente({ idToken, negocioId, onSesionVencida }: Props) {
  const { clienteId = '' } = useParams()
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [notas, setNotas] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [existente, setExistente] = useState<ClienteExistente | null>(null)
  const [guardado, setGuardado] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let cancelado = false
    obtenerFicha(idToken, negocioId, clienteId)
      .then((datos) => {
        if (cancelado) return
        setFicha(datos)
        setNombre(datos.nombre)
        setTelefono(datos.telefono)
        setCorreo(datos.correo ?? '')
        setNotas(datos.notas ?? '')
      })
      .catch((error: unknown) => {
        if (cancelado) return
        const leido = leerErrorCliente(error)
        if (!leido) {
          onSesionVencida()
        } else if (
          error instanceof OperacionRechazadaError &&
          (error.status === 404 || error.status === 400)
        ) {
          setNoEncontrado(true)
        } else {
          setErrores({ general: 'No pudimos cargar la ficha. Probá de nuevo en unos minutos.' })
        }
      })
    return () => {
      cancelado = true
    }
  }, [idToken, negocioId, clienteId, onSesionVencida])

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    setErrores({})
    setExistente(null)
    setGuardado(false)
    setGuardando(true)
    try {
      const actualizado = await actualizarCliente(idToken, negocioId, clienteId, {
        nombre,
        telefono,
        correo,
        notas,
      })
      setFicha((actual) => (actual ? { ...actual, ...actualizado } : actual))
      setTelefono(actualizado.telefono)
      setGuardado(true)
    } catch (error) {
      const leido = leerErrorCliente(error)
      if (!leido) {
        onSesionVencida()
      } else {
        setErrores(leido.errores)
        setExistente(leido.existente)
      }
    } finally {
      setGuardando(false)
    }
  }

  const volver = (
    <p>
      <Link to={`/negocios/${negocioId}/clientes`}>Volver a clientes</Link>
    </p>
  )

  if (noEncontrado) {
    return (
      <section>
        <p role="alert">No encontramos ese cliente.</p>
        {volver}
      </section>
    )
  }
  if (!ficha) {
    return (
      <section>
        {errores.general ? <p role="alert">{errores.general}</p> : <p>Cargando la ficha…</p>}
        {volver}
      </section>
    )
  }

  return (
    <section>
      <h2>{ficha.nombre}</h2>
      {volver}

      <form className="formulario" onSubmit={(e) => void guardar(e)} noValidate>
        <h3>Datos de contacto y notas</h3>
        <label>
          Nombre *
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          {errores.nombre && <span role="alert" className="error">{errores.nombre}</span>}
        </label>
        <label>
          Teléfono *
          <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          {errores.telefono && <span role="alert" className="error">{errores.telefono}</span>}
        </label>
        {existente && (
          <p className="aviso">
            <Link to={`/negocios/${negocioId}/clientes/${existente.id}`}>
              Abrir la ficha de {existente.nombre}
            </Link>
          </p>
        )}
        <label>
          Correo electrónico
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
          {errores.correo && <span role="alert" className="error">{errores.correo}</span>}
        </label>
        <label>
          Notas
          <textarea rows={4} value={notas} onChange={(e) => setNotas(e.target.value)} />
          {errores.notas && <span role="alert" className="error">{errores.notas}</span>}
        </label>
        {errores.general && <span role="alert" className="error">{errores.general}</span>}
        {guardado && <p className="aviso">Cambios guardados.</p>}
        <div className="acciones">
          <button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      <h3>Historial de servicios</h3>
      {ficha.historial.length === 0 ? (
        <p>Este cliente todavía no tiene turnos registrados.</p>
      ) : (
        <ul className="lista">
          {ficha.historial.map((turno) => (
            <li key={turno.id}>
              <span>
                <strong>
                  {fechaLarga(turno.fecha)}, {turno.horaInicio}
                </strong>{' '}
                · {turno.servicio}
              </span>
              <span>
                {turno.resultado ? RESULTADO[turno.resultado] : ESTADO[turno.estado]}
                {turno.notaCierre && ` · ${turno.notaCierre}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
