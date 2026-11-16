import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { SesionVencidaError } from '../auth/api'
import type { Errores } from '../negocios/validacion'
import { listarClientes, registrarCliente, type Cliente } from './api'
import { leerErrorCliente, type ClienteExistente } from './errores'

interface Props {
  idToken: string
  negocioId: string
  onSesionVencida: () => void
}

/** CU 11: listado y alta de clientes (RF-42). */
export default function Clientes({ idToken, negocioId, onSesionVencida }: Props) {
  const [clientes, setClientes] = useState<Cliente[] | null>(null)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [existente, setExistente] = useState<ClienteExistente | null>(null)
  const [filtro, setFiltro] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let cancelado = false
    listarClientes(idToken, negocioId)
      .then((datos) => {
        if (!cancelado) setClientes(datos)
      })
      .catch((error: unknown) => {
        if (cancelado) return
        if (error instanceof SesionVencidaError) {
          onSesionVencida()
        } else {
          setErrores({ general: 'No pudimos cargar los clientes. Probá de nuevo en unos minutos.' })
        }
      })
    return () => {
      cancelado = true
    }
  }, [idToken, negocioId, onSesionVencida])

  async function registrar(evento: FormEvent) {
    evento.preventDefault()
    setErrores({})
    setExistente(null)
    setGuardando(true)
    try {
      const nuevo = await registrarCliente(idToken, negocioId, { nombre, telefono })
      setClientes((actuales) =>
        [...(actuales ?? []), nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      )
      setNombre('')
      setTelefono('')
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

  const texto = filtro.trim().toLowerCase()
  const digitos = filtro.replace(/\D/g, '').replace(/^0/, '')
  const visibles = clientes?.filter(
    (cliente) =>
      !texto ||
      cliente.nombre.toLowerCase().includes(texto) ||
      (digitos !== '' && cliente.telefono.replace(/^\+598/, '').startsWith(digitos)),
  )

  return (
    <section>
      <h2>Clientes</h2>
      <p>
        <Link to={`/negocios/${negocioId}`}>Volver al panel</Link>
      </p>

      <form className="formulario" onSubmit={(e) => void registrar(e)} noValidate>
        <h3>Nuevo cliente</h3>
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
        {errores.general && <span role="alert" className="error">{errores.general}</span>}
        <div className="acciones">
          <button type="submit" disabled={guardando}>
            {guardando ? 'Registrando…' : 'Registrar cliente'}
          </button>
        </div>
      </form>

      {clientes && clientes.length > 0 && (
        <label className="buscador">
          Buscar por nombre o teléfono
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </label>
      )}
      {clientes && clientes.length === 0 && <p>Todavía no hay clientes registrados.</p>}
      {visibles && clientes && clientes.length > 0 && visibles.length === 0 && (
        <p>Ningún cliente coincide con la búsqueda.</p>
      )}
      <ul className="lista">
        {visibles?.map((cliente) => (
          <li key={cliente.id}>
            <Link to={`/negocios/${negocioId}/clientes/${cliente.id}`}>
              <strong>{cliente.nombre}</strong>
            </Link>
            <span>{cliente.telefono}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
