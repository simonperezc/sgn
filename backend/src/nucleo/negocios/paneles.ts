import { Plantilla } from '../entities/enums';

/** Paneles del núcleo común: los habilitan todas las plantillas (RF-23, RF-85). */
export const PANELES_NUCLEO = [
  'servicios',
  'agenda',
  'clientes',
  'finanzas',
  'empleados',
] as const;

const PANELES_DE_RUBRO: Record<Plantilla, readonly string[]> = {
  [Plantilla.GENERICO]: [],
  [Plantilla.ODONTOLOGIA]: ['tratamientos', 'presupuestos', 'historial-dental'],
  [Plantilla.NUTRICION]: ['objetivos', 'planes-alimentacion'],
};

/** Paneles que habilita una plantilla: el núcleo más los de su rubro (RF-23). */
export function panelesPorPlantilla(plantilla: Plantilla): string[] {
  return [...PANELES_NUCLEO, ...PANELES_DE_RUBRO[plantilla]];
}
