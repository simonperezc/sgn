import type { Plantilla } from './api'

export interface OpcionPlantilla {
  valor: Plantilla
  nombre: string
  detalle: string
  /** Funciones que habilita, para mostrarlas antes de registrarse (RF-93). */
  funciones: string[]
}

const NUCLEO = ['Servicios', 'Agenda', 'Clientes', 'Finanzas', 'Empleados']

/** Plantillas disponibles al registrar un negocio (RF-22, RF-23). */
export const PLANTILLAS: OpcionPlantilla[] = [
  {
    valor: 'ODONTOLOGIA',
    nombre: 'Odontología',
    detalle: 'Núcleo común más tratamientos, presupuestos e historial dental.',
    funciones: [...NUCLEO, 'Tratamientos', 'Presupuestos', 'Historial dental'],
  },
  {
    valor: 'NUTRICION',
    nombre: 'Nutrición',
    detalle: 'Núcleo común más objetivos y planes de alimentación.',
    funciones: [...NUCLEO, 'Objetivos', 'Planes de alimentación'],
  },
  {
    valor: 'GENERICO',
    nombre: 'Genérico básico',
    detalle: 'Solo las funciones del núcleo común.',
    funciones: NUCLEO,
  },
]

export function nombrePlantilla(valor: Plantilla): string {
  return PLANTILLAS.find((opcion) => opcion.valor === valor)?.nombre ?? valor
}
