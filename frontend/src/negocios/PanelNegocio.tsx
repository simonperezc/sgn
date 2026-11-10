import { Link } from 'react-router'
import type { Negocio, Plantilla } from './api'
import FotoNegocio from './FotoNegocio'

const NOMBRE_PLANTILLA: Record<Plantilla, string> = {
  ODONTOLOGIA: 'Odontología',
  NUTRICION: 'Nutrición',
  GENERICO: 'Genérico básico',
}

const NOMBRE_PANEL: Record<string, string> = {
  servicios: 'Servicios',
  agenda: 'Agenda',
  clientes: 'Clientes',
  finanzas: 'Finanzas',
  empleados: 'Empleados',
  tratamientos: 'Tratamientos',
  presupuestos: 'Presupuestos',
  'historial-dental': 'Historial dental',
  objetivos: 'Objetivos',
  'planes-alimentacion': 'Planes de alimentación',
}

/** Paneles que ya tienen pantalla; el resto llega en sus sprints. */
const PANELES_DISPONIBLES = new Set(['servicios'])

interface Props {
  idToken: string
  negocio: Negocio
}

/** Panel general: datos del negocio y paneles de su plantilla (RF-18, RF-23). */
export default function PanelNegocio({ idToken, negocio }: Props) {
  return (
    <section>
      {negocio.tieneFoto && <FotoNegocio idToken={idToken} negocioId={negocio.id} />}
      <h2>{negocio.nombre}</h2>
      <p>Plantilla: {NOMBRE_PLANTILLA[negocio.plantilla]}</p>
      {negocio.direccion && <p>Dirección: {negocio.direccion}</p>}
      {negocio.contacto && <p>Contacto: {negocio.contacto}</p>}
      <p>
        <Link to={`/negocios/${negocio.id}/datos`}>Editar datos del negocio</Link>
      </p>
      <ul className="paneles">
        {negocio.paneles.map((panel) => {
          const nombre = NOMBRE_PANEL[panel] ?? panel
          return (
            <li key={panel}>
              {PANELES_DISPONIBLES.has(panel) ? (
                <Link to={`/negocios/${negocio.id}/${panel}`}>{nombre}</Link>
              ) : (
                nombre
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
