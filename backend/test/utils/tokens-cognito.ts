import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const REGION = 'us-east-2';
const USER_POOL_ID = 'us-east-2_Prueba123';

/** Datos de un User Pool ficticio, solo para pruebas. */
export const POOL_PRUEBA = {
  region: REGION,
  userPoolId: USER_POOL_ID,
  clientId: 'cliente-de-prueba',
  issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`,
};

function crearClaves(kid: string) {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const jwk = {
    ...publicKey.export({ format: 'jwk' }),
    kid,
    alg: 'RS256',
    use: 'sig',
  };
  return { privateKey, jwk };
}

/** Clave "oficial" del pool de prueba y una clave ajena, para firmas inválidas. */
export const CLAVE_POOL = crearClaves('clave-pool');
export const CLAVE_AJENA = crearClaves('clave-pool'); // mismo kid, otra clave

/** Verificador real de aws-jwt-verify, con las claves públicas ya cargadas (sin red). */
export function crearVerificadorDePrueba() {
  const verificador = CognitoJwtVerifier.create({
    userPoolId: POOL_PRUEBA.userPoolId,
    clientId: POOL_PRUEBA.clientId,
    tokenUse: 'id',
  });
  verificador.cacheJwks({ keys: [CLAVE_POOL.jwk] } as never);
  return verificador;
}

/** Firma un token de ID con el formato de Cognito. */
export function firmarToken(
  cambios: Record<string, unknown> = {},
  clave: KeyObject = CLAVE_POOL.privateKey,
): string {
  const ahora = Math.floor(Date.now() / 1000);
  const claims = {
    sub: '11111111-2222-3333-4444-555555555555',
    email: 'florencia@ejemplo.com',
    name: 'Florencia Pérez',
    aud: POOL_PRUEBA.clientId,
    iss: POOL_PRUEBA.issuer,
    token_use: 'id',
    auth_time: ahora,
    iat: ahora,
    exp: ahora + 3600,
    ...cambios,
  };
  const cabecera = { alg: 'RS256', kid: 'clave-pool', typ: 'JWT' };
  const parte = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString('base64url');
  const contenido = `${parte(cabecera)}.${parte(claims)}`;
  const firma = sign('RSA-SHA256', Buffer.from(contenido), clave).toString(
    'base64url',
  );
  return `${contenido}.${firma}`;
}
