import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { SesionVencidaError } from '../auth/api'
import {
  actualizarNegocio,
  DatosInvalidosError,
  OperacionRechazadaError,
  subirFoto,
  type Horario,
  type Negocio,
} from './api'
import FotoNegocio from './FotoNegocio'
import HorarioEditor from './HorarioEditor'
import { validarDatos, type Errores } from './validacion'

interface Props {
  idToken: string
  negocio: Negocio
  onGuardado: (negocio: Negocio) => void
  onSesionVencida: () => void
}

const ERROR_GENERAL = 'No pudimos guardar los cambios. Probá de nuevo en unos minutos.'

/** CU 4, paso 2: edición de foto, dirección, contacto y horario (RF-18). */
export default function EditarNegocio({
  idToken,
  negocio,
  onGuardado,
  onSesionVencida,
}: Props) {
  const [nombre, setNombre] = useState(negocio.nombre)
  const [contacto, setContacto] = useState(negocio.contacto ?? '')
  const [direccion, setDireccion] = useState(negocio.direccion ?? '')
  const [horario, setHorario] = useState<Horario>(negocio.horarioDisponible ?? {})
  const [foto, setFoto] = useState<File | null>(null)
  const [errores, setErrores] = useState<Errores>({})
  const [guardando, setGuardando] = useState(false)

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    const encontrados = validarDatos(nombre, horario)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) {
      return
    }

    setGuardando(true)
    try {
      // La foto va primero: si se rechaza, no se modifica nada (CP-S3-17).
      if (foto) {
        await subirFoto(idToken, negocio.id, foto)
      }
      const guardado = await actualizarNegocio(idToken, negocio.id, {
        nombre,
        contacto,
        direccion,
        horarioDisponible: horario,
      })
      onGuardado(guardado)
    } catch (error) {
      if (error instanceof SesionVencidaError) {
        onSesionVencida()
      } else if (error instanceof DatosInvalidosError) {
        setErrores(Object.fromEntries(error.campos.map((c) => [c.campo, c.mensaje])))
      } else if (error instanceof OperacionRechazadaError) {
        setErrores({ general: error.message })
      } else {
        setErrores({ general: ERROR_GENERAL })
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={(e) => void guardar(e)} noValidate>
      <h2>Datos del negocio</h2>
      {negocio.tieneFoto && <FotoNegocio idToken={idToken} negocioId={negocio.id} />}
      <label>
        Foto (JPG, PNG o WebP, hasta 1 MB)
        <input type="file" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
      </label>
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
        <Link to={`/negocios/${negocio.id}`}>Volver</Link>
        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
