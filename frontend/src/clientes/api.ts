import { apiUrl } from '../auth/config'
import { cabeceras, errorDe } from '../negocios/api'

export interface Cliente {
  id: string
  nombre: string
  telefono: string
  correo: string | null
  notas: string | null
}

export interface TurnoHistorial {
  id: string
  fecha: string
  horaInicio: string
  servicio: string
  estado: 'PENDIENTE_PAGO' | 'CONFIRMADO' | 'CANCELADO'
  resultado: 'REALIZADO' | 'NO_ASISTIO' | null
  notaCierre: string | null
}

export interface FichaCliente extends Cliente {
  historial: TurnoHistorial[]
}

export interface DatosCliente {
  nombre: string
  telefono: string
  correo?: string
  notas?: string
}

function ruta(negocioId: string): string {
  return `${apiUrl}/negocios/${negocioId}/clientes`
}

export async function listarClientes(idToken: string, negocioId: string): Promise<Cliente[]> {
  const respuesta = await fetch(ruta(negocioId), { headers: cabeceras(idToken) })
  if (!respuesta.ok) {
    throw await errorDe(respuesta)
  }
  return (await respuesta.json()) as Cliente[]
}

export async function registrarCliente(
  idToken: string,
  negocioId: string,
  datos: DatosCliente,
): Promise<Cliente> {
  const respuesta = await fetch(ruta(negocioId), {
    method: 'POST',
    headers: cabeceras(idToken),
    body: JSON.stringify(datos),
  })
  if (!respuesta.ok) {
    throw await errorDe(respuesta)
  }
  return (await respuesta.json()) as Cliente
}

export async function obtenerFicha(
  idToken: string,
  negocioId: string,
  clienteId: string,
): Promise<FichaCliente> {
  const respuesta = await fetch(`${ruta(negocioId)}/${clienteId}`, {
    headers: cabeceras(idToken),
  })
  if (!respuesta.ok) {
    throw await errorDe(respuesta)
  }
  return (await respuesta.json()) as FichaCliente
}

export async function actualizarCliente(
  idToken: string,
  negocioId: string,
  clienteId: string,
  datos: DatosCliente,
): Promise<Cliente> {
  const respuesta = await fetch(`${ruta(negocioId)}/${clienteId}`, {
    method: 'PATCH',
    headers: cabeceras(idToken),
    body: JSON.stringify(datos),
  })
  if (!respuesta.ok) {
    throw await errorDe(respuesta)
  }
  return (await respuesta.json()) as Cliente
}
