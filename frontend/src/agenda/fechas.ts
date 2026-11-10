/** Fecha de hoy (AAAA-MM-DD) según el reloj del navegador. */
export function hoy(): string {
  return new Date().toLocaleDateString('en-CA')
}

export function sumarDias(fecha: string, dias: number): string {
  const resultado = new Date(`${fecha}T00:00:00Z`)
  resultado.setUTCDate(resultado.getUTCDate() + dias)
  return resultado.toISOString().slice(0, 10)
}

/** Por ejemplo, "lunes 2 de enero". */
export function fechaLarga(fecha: string): string {
  return new Intl.DateTimeFormat('es-UY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${fecha}T00:00:00Z`))
}
