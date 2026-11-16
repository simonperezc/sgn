import type { ErrorCampo } from '../negocios/negocio.validacion';
import { MENSAJE_TELEFONO_INVALIDO, normalizarTelefono } from './telefono';

const MAX_NOMBRE = 120;
const MAX_CORREO = 254;
const MAX_NOTAS = 2000;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarNombreCliente(valor: unknown): ErrorCampo | null {
  if (typeof valor !== 'string' || valor.trim() === '') {
    return { campo: 'nombre', mensaje: 'Ingresá el nombre del cliente' };
  }
  return valor.trim().length > MAX_NOMBRE
    ? {
        campo: 'nombre',
        mensaje: `El nombre no puede superar los ${MAX_NOMBRE} caracteres`,
      }
    : null;
}

/** CP-S3-47: un teléfono que no es uruguayo se rechaza con un mensaje claro. */
export function validarTelefono(valor: unknown): ErrorCampo | null {
  return normalizarTelefono(valor)
    ? null
    : { campo: 'telefono', mensaje: MENSAJE_TELEFONO_INVALIDO };
}

export function validarCorreo(valor: unknown): ErrorCampo | null {
  if (valor === undefined || valor === null || valor === '') {
    return null;
  }
  return typeof valor === 'string' &&
    valor.trim().length <= MAX_CORREO &&
    CORREO.test(valor.trim())
    ? null
    : { campo: 'correo', mensaje: 'Ingresá un correo electrónico válido' };
}

export function validarNotas(valor: unknown): ErrorCampo | null {
  if (valor === undefined || valor === null) {
    return null;
  }
  return typeof valor === 'string' && valor.length <= MAX_NOTAS
    ? null
    : {
        campo: 'notas',
        mensaje: `Las notas no pueden superar los ${MAX_NOTAS} caracteres`,
      };
}
