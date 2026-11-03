/**
 * Opciones de TLS para PostgreSQL. En producción (Azure) la base exige
 * conexiones cifradas (RNF-2): con DB_SSL=true se cifra y se valida el
 * certificado del servidor. En local y en el CI queda sin TLS.
 */
export function opcionesSsl(valor: string | undefined) {
  return valor === 'true' ? { rejectUnauthorized: true } : false;
}
