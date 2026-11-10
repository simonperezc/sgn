/** Tamaño máximo de la foto del negocio: 1 MB. */
export const TAMANO_MAXIMO_FOTO = 1024 * 1024;

/**
 * Detecta el tipo de imagen por su contenido (CP-S3-17), sin confiar en el
 * nombre ni en el tipo que declara el navegador. Devuelve null si no es imagen.
 */
export function detectarTipoImagen(datos: Buffer): string | null {
  const empiezaCon = (...bytes: number[]) =>
    bytes.every((byte, i) => datos[i] === byte);

  if (empiezaCon(0xff, 0xd8, 0xff)) {
    return 'image/jpeg';
  }
  if (empiezaCon(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return 'image/png';
  }
  if (
    datos.length >= 12 &&
    datos.toString('latin1', 0, 4) === 'RIFF' &&
    datos.toString('latin1', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}
