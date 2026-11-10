import { useState, type FormEvent } from 'react'
import { SesionVencidaError } from '../auth/api'
import {
  crearNegocio,
  DatosInvalidosError,
  type Horario,
  type Negocio,
  type Plantilla,
} from './api'
import HorarioEditor from './HorarioEditor'
import { validarDatos, type Errores } from './validacion'

interface Props {
  idToken: string
  onCreado: (negocio: Negocio) => void
  onSesionVencida: () => void
}

const PLANTILLAS: { valor: Plantilla; nombre: string; detalle: string }[] = [
  {
    valor: 'ODONTOLOGIA',
    nombre: 'Odontología',
    detalle: 'Núcleo común más tratamientos, presupuestos e historial dental.',
  },
  {
    valor: 'NUTRICION',
    nombre: 'Nutrición',
    detalle: 'Núcleo común más objetivos y planes de alimentación.',
  },
  {
    valor: 'GENERICO',
    nombre: 'Genérico básico',
    detalle: 'Solo las funciones del núcleo común.',
  },
]

/** CU 1, pasos 5 a 10: datos del negocio y elección de la plantilla. */
export default function AltaNegocio({ idToken, onCreado, onSesionVencida }: Props) {
  const [paso, setPaso] = useState<'datos' | 'plantilla'>('datos')
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [direccion, setDireccion] = useState('')
  const [horario, setHorario] = useState<Horario>({})
  const [plantilla, setPlantilla] = useState<Plantilla | null>(null)
  const [errores, setErrores] = useState<Errores>({})
  const [enviando, setEnviando] = useState(false)

  function confirmarDatos(evento: FormEvent) {
    evento.preventDefault()
    const encontrados = validarDatos(nombre, horario)
    setErrores(encontrados)
    if (Object.keys(encontrados).length === 0) {
      setPaso('plantilla')
    }
  }

  async function registrar(evento: FormEvent) {
    evento.preventDefault()
    if (!plantilla) {
      setErrores({ plantilla: 'Elegí una plantilla para el negocio' })
      return
    }
    setErrores({})
    setEnviando(true)
    try {
      onCreado(
        await crearNegocio(idToken, {
          nombre,
          contacto,
          direccion,
          horarioDisponible: horario,
          plantilla,
        }),
      )
    } catch (error) {
      if (error instanceof SesionVencidaError) {
        onSesionVencida()
      } else if (error instanceof DatosInvalidosError) {
        setErrores(
          Object.fromEntries(error.campos.map((c) => [c.campo, c.mensaje])),
        )
        // CU 1 (9a): vuelve a los datos, salvo que solo falle la plantilla.
        if (error.campos.some((c) => c.campo !== 'plantilla')) {
          setPaso('datos')
        }
      } else {
        setErrores({ general: 'No pudimos registrar el negocio. Probá de nuevo en unos minutos.' })
      }
    } finally {
      setEnviando(false)
    }
  }

  if (paso === 'datos') {
    return (
      <form className="formulario" onSubmit={confirmarDatos} noValidate>
        <h2>Registrá tu negocio</h2>
        <label>
          Nombre del negocio *
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          {errores.nombre && <span role="alert" className="error">{errores.nombre}</span>}
        </label>
        <label>
          Contacto
          <input value={contacto} onChange={(e) => setContacto(e.target.value)} />
          {errores.contacto && <span role="alert" className="error">{errores.contacto}</span>}
        </label>
        <label>
          Dirección
          <input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          {errores.direccion && <span role="alert" className="error">{errores.direccion}</span>}
        </label>
        <fieldset>
          <legend>Horario disponible *</legend>
          <HorarioEditor horario={horario} onChange={setHorario} />
          {errores.horarioDisponible && (
            <span role="alert" className="error">{errores.horarioDisponible}</span>
          )}
        </fieldset>
        <button type="submit">Continuar</button>
      </form>
    )
  }

  return (
    <form className="formulario" onSubmit={(e) => void registrar(e)} noValidate>
      <h2>Elegí la plantilla</h2>
      <p className="aviso">La plantilla no podrá modificarse una vez registrado el negocio.</p>
      {PLANTILLAS.map((opcion) => (
        <label className="opcion-plantilla" key={opcion.valor}>
          <input
            type="radio"
            name="plantilla"
            checked={plantilla === opcion.valor}
            onChange={() => setPlantilla(opcion.valor)}
          />
          <span>
            <strong>{opcion.nombre}</strong>
            <br />
            {opcion.detalle}
          </span>
        </label>
      ))}
      {plantilla === 'GENERICO' && (
        <p className="aviso">
          Se habilitarán únicamente servicios, agenda, clientes, finanzas y empleados.
        </p>
      )}
      {errores.plantilla && <span role="alert" className="error">{errores.plantilla}</span>}
      {errores.general && <span role="alert" className="error">{errores.general}</span>}
      <div className="acciones">
        <button type="button" onClick={() => setPaso('datos')} disabled={enviando}>
          Volver
        </button>
        <button type="submit" disabled={enviando}>
          {enviando ? 'Registrando…' : 'Registrar negocio'}
        </button>
      </div>
    </form>
  )
}
