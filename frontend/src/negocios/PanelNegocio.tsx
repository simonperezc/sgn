import { Link, useParams } from 'react-router'
import type { Negocio, Plantilla } from './api'

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

/** Panel general: muestra únicamente los paneles de la plantilla (RF-23). */
export default function PanelNegocio({ negocios }: { negocios: Negocio[] }) {
  const { negocioId } = useParams()
  const negocio = negocios.find((n) => n.id === negocioId)

  if (!negocio) {
    return (
      <p role="alert">
        No encontramos ese negocio. <Link to="/">Volver al inicio</Link>
      </p>
    )
  }

  return (
    <section>
      <h2>{negocio.nombre}</h2>
      <p>Plantilla: {NOMBRE_PLANTILLA[negocio.plantilla]}</p>
      <ul className="paneles">
        {negocio.paneles.map((panel) => (
          <li key={panel}>{NOMBRE_PANEL[panel] ?? panel}</li>
        ))}
      </ul>
    </section>
  )
}
