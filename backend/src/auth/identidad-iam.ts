/** Datos de identidad que entrega Cognito en el token ya validado. */
export interface IdentidadIAM {
  /** Identificador único del usuario en Cognito (claim "sub"). */
  idIAM: string;
  correo: string;
  nombre: string;
}
