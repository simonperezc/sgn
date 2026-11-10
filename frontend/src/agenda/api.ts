import { apiUrl } from '../auth/config'
import { cabeceras, errorDe } from '../negocios/api'

export type EstadoTurno = 'PENDIENTE_PAGO' | 'CONFIRMADO' | 'CANCELADO'

export interface ClienteResumen {
  id: string
  nombre: string
  telefono: string
}

export interface Turno {
  id: string
  fecha: string
  horaInicio: string
  horaFin: string
  estado: EstadoTurno
  notaCliente: string | null
  cliente: ClienteResumen
  servicio: { id: string; nombre: string; duracionMin: number }
}

export interface DatosTurno {
  clienteId?: string
  clienteNuevo?: { nombre: string; telefono: string }
  servicioId: string | null
  fecha: string
  horaInicio: string
}

function ruta(negocioId: string): string {
  return `${apiUrl}/negocios/${negocioId}/turnos`
}

export async function listarTurnos(
  idToken: string,
  negocioId: string,
  fecha: string,
): Promise<Turno[]> {
  const respuesta = await fetch(`${ruta(negocioId)}?fecha=${fecha}`, {
    headers: cabeceras(idToken),
  })
  if (!respuesta.ok) {
    throw await errorDe(respuesta)
  }
  return (await respuesta.json()) as Turno[]
}

/** Alta (sin turnoId) o edición de un turno. */
export async function guardarTurno(
  idToken: string,
  negocioId: string,
  datos: Partial<DatosTurno>,
  turnoId?: string,
): Promise<Turno> {
  const respuesta = await fetch(turnoId ? `${ruta(negocioId)}/${turnoId}` : ruta(negocioId), {
    method: turnoId ? 'PATCH' : 'POST',
    headers: cabeceras(idToken),
    body: JSON.stringify(datos),
  })
  if (!respuesta.ok) {
    throw await errorDe(respuesta)
  }
  return (await respuesta.json()) as Turno
}

export async function cancelarTurno(
  idToken: string,
  negocioId: string,
  turnoId: string,
): Promise<Turno> {
  const respuesta = await fetch(`${ruta(negocioId)}/${turnoId}/cancelar`, {
    method: 'POST',
    headers: cabeceras(idToken),
  })
  if (!respuesta.ok) {
    throw await errorDe(respuesta)
  }
  return (await respuesta.json()) as Turno
}

/** Busca al cliente por teléfono; null si no está registrado (RF-91). */
export async function buscarClientePorTelefono(
  idToken: string,
  negocioId: string,
  telefono: string,
): Promise<ClienteResumen | null> {
  const parametros = new URLSearchParams({ telefono })
  const respuesta = await fetch(`${apiUrl}/negocios/${negocioId}/clientes?${parametros}`, {
    headers: cabeceras(idToken),
  })
  if (!respuesta.ok) {
    throw await errorDe(respuesta)
  }
  const encontrados = (await respuesta.json()) as ClienteResumen[]
  return encontrados[0] ?? null
}
