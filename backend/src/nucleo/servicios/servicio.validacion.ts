import type { ErrorCampo } from '../negocios/negocio.validacion';

const MAX_NOMBRE = 120;
const MAX_DURACION = 24 * 60;

export function validarNombreServicio(valor: unknown): ErrorCampo | null {
  if (typeof valor !== 'string' || valor.trim() === '') {
    return { campo: 'nombre', mensaje: 'Ingresá el nombre del servicio' };
  }
  if (valor.trim().length > MAX_NOMBRE) {
    return {
      campo: 'nombre',
      mensaje: `El nombre no puede superar los ${MAX_NOMBRE} caracteres`,
    };
  }
  return null;
}

/** La duración son minutos enteros y positivos (CP-S3-21, CP-S3-22). */
export function validarDuracion(valor: unknown): ErrorCampo | null {
  if (valor === undefined || valor === null || valor === '') {
    return {
      campo: 'duracionMin',
      mensaje: 'Ingresá la duración del servicio',
    };
  }
  if (
    typeof valor !== 'number' ||
    !Number.isInteger(valor) ||
    valor <= 0 ||
    valor > MAX_DURACION
  ) {
    return {
      campo: 'duracionMin',
      mensaje: `La duración debe ser de 1 a ${MAX_DURACION} minutos`,
    };
  }
  return null;
}
