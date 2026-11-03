/** Token de inyección del verificador de tokens de Cognito. */
export const COGNITO_VERIFIER = Symbol('COGNITO_VERIFIER');

/** Token de inyección del reloj (permite fijar la hora en las pruebas). */
export const RELOJ = Symbol('RELOJ');

/** Devuelve la hora actual en milisegundos, como Date.now(). */
export type Reloj = () => number;
