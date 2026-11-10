/**
 * Normaliza un teléfono uruguayo al formato internacional (RF-89, RF-91).
 * Acepta celulares (09X XXX XXX) y fijos de 8 dígitos (2… o 4…), con o sin
 * +598, y con espacios, guiones, puntos o paréntesis. Devuelve null si no es
 * un teléfono uruguayo válido.
 */
export function normalizarTelefono(valor: unknown): string | null {
  if (typeof valor !== 'string') {
    return null;
  }
  const limpio = valor.replace(/[\s\-().]/g, '');

  let nacional: string;
  if (/^\+598\d+$/.test(limpio)) {
    nacional = limpio.slice(4);
  } else if (/^00598\d+$/.test(limpio)) {
    nacional = limpio.slice(5);
  } else if (/^598\d{8}$/.test(limpio)) {
    nacional = limpio.slice(3);
  } else if (/^0\d+$/.test(limpio)) {
    nacional = limpio.slice(1);
  } else if (/^\d+$/.test(limpio)) {
    nacional = limpio;
  } else {
    return null;
  }

  return /^(9|2|4)\d{7}$/.test(nacional) ? `+598${nacional}` : null;
}

export const MENSAJE_TELEFONO_INVALIDO =
  'Ingresá un teléfono uruguayo válido: celular (09X XXX XXX) o fijo de 8 dígitos';
