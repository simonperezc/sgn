/** Rol global en la plataforma. Dueño y empleado se definen por negocio, no acá. */
export enum Rol {
  USUARIO = 'USUARIO',
  ADMIN_PLATAFORMA = 'ADMIN_PLATAFORMA',
}

/** Plantilla elegida al registrar el negocio; no se puede cambiar después (RF-22). */
export enum Plantilla {
  GENERICO = 'GENERICO',
  ODONTOLOGIA = 'ODONTOLOGIA',
  NUTRICION = 'NUTRICION',
}

export enum EstadoTurno {
  PENDIENTE_PAGO = 'PENDIENTE_PAGO',
  CONFIRMADO = 'CONFIRMADO',
  CANCELADO = 'CANCELADO',
}

export enum Canal {
  MANUAL = 'MANUAL',
  WEB = 'WEB',
  TELEGRAM = 'TELEGRAM',
}

/** Resultado del cierre de turno (RF-86). Nulo mientras el turno no se cerró. */
export enum ResultadoTurno {
  REALIZADO = 'REALIZADO',
  NO_ASISTIO = 'NO_ASISTIO',
}
