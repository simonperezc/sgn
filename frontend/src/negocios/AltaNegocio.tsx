import { useState, type FormEvent } from 'react'
import { SesionVencidaError } from '../auth/api'
import {
  DatosInvalidosError,
  type DatosNuevoNegocio,
  type Horario,
  type Plantilla,
} from './api'
import HorarioEditor from './HorarioEditor'
import { nombrePlantilla, PLANTILLAS } from './plantillas'
import { validarDatos, type Errores } from './validacion'

interface Props {
  /** Si viene, se empieza por los datos (plantilla ya elegida). */
  plantillaInicial?: Plantilla
  /** Datos a precargar (CU 23, 10a, o al modificar el borrador). */
  datosIniciales?: DatosNuevoNegocio
  erroresIniciales?: Errores
  textoConfirmar: string
  /** Registra el negocio o guarda el borrador; si falla, se muestra el error. */
  onConfirmar: (datos: DatosNuevoNegocio) => Promise<void>
  onSesionVencida?: () => void
  onCancelar?: () => void
}

/**
 * Alta de negocio: primero la plantilla y después los datos (CU 1, pasos 5 a
 * 10, y CU 23, pasos 3 a 6). Se usa con y sin sesión iniciada.
 */
export default function AltaNegocio({
  plantillaInicial,
  datosIniciales,
  erroresIniciales,
  textoConfirmar,
  onConfirmar,
  onSesionVencida,
  onCancelar,
}: Props) {
  const inicial = datosIniciales?.plantilla ?? plantillaInicial ?? null
  const [paso, setPaso] = useState<'plantilla' | 'datos'>(inicial ? 'datos' : 'plantilla')
  const [plantilla, setPlantilla] = useState<Plantilla | null>(inicial)
  const [nombre, setNombre] = useState(datosIniciales?.nombre ?? '')
  const [contacto, setContacto] = useState(datosIniciales?.contacto ?? '')
  const [direccion, setDireccion] = useState(datosIniciales?.direccion ?? '')
  const [horario, setHorario] = useState<Horario>(datosIniciales?.horarioDisponible ?? {})
  const [errores, setErrores] = useState<Errores>(erroresIniciales ?? {})
  const [enviando, setEnviando] = useState(false)

  function elegirPlantilla(evento: FormEvent) {
    evento.preventDefault()
    if (!plantilla) {
      setErrores({ plantilla: 'Elegí una plantilla para el negocio' })
      return
    }
    setErrores({})
    setPaso('datos')
  }

  async function confirmar(evento: FormEvent) {
    evento.preventDefault()
    const encontrados = validarDatos(nombre, horario)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0 || !plantilla) {
      return
    }
    setEnviando(true)
    try {
      await onConfirmar({ nombre, contacto, direccion, horarioDisponible: horario, plantilla })
    } catch (error) {
      if (error instanceof SesionVencidaError && onSesionVencida) {
        onSesionVencida()
      } else if (error instanceof DatosInvalidosError) {
        setErrores(Object.fromEntries(error.campos.map((c) => [c.campo, c.mensaje])))
        if (error.campos.some((c) => c.campo === 'plantilla')) {
          setPaso('plantilla')
        }
      } else {
        setErrores({ general: 'No pudimos registrar el negocio. Probá de nuevo en unos minutos.' })
      }
    } finally {
      setEnviando(false)
    }
  }

  if (paso === 'plantilla' || !plantilla) {
    return (
      <form className="formulario" onSubmit={elegirPlantilla} noValidate>
        <h2>Elegí la plantilla de tu negocio</h2>
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
        {errores.plantilla && <span role="alert" className="error">{errores.plantilla}</span>}
        <div className="acciones">
          {onCancelar && (
            <button type="button" onClick={onCancelar}>
              Volver
            </button>
          )}
          <button type="submit">Continuar</button>
        </div>
      </form>
    )
  }

  return (
    <form className="formulario" onSubmit={(e) => void confirmar(e)} noValidate>
      <h2>Datos de tu negocio</h2>
      <p className="aviso">
        Plantilla: <strong>{nombrePlantilla(plantilla)}</strong>. No podrá modificarse una vez
        registrado el negocio.
        {plantilla === 'GENERICO' &&
          ' Se habilitarán únicamente servicios, agenda, clientes, finanzas y empleados.'}
      </p>
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
      {errores.general && <span role="alert" className="error">{errores.general}</span>}
      <div className="acciones">
        <button
          type="button"
          onClick={() => {
            setErrores({})
            setPaso('plantilla')
          }}
          disabled={enviando}
        >
          Cambiar plantilla
        </button>
        <button type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : textoConfirmar}
        </button>
      </div>
    </form>
  )
}
