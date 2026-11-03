import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import {
  CLAVE_AJENA,
  crearVerificadorDePrueba,
  firmarToken,
} from '../../test/utils/tokens-cognito';
import { CognitoAuthGuard, RequestConIdentidad } from './cognito-auth.guard';

function contextoCon(authorization?: string) {
  const request = { headers: { authorization } } as RequestConIdentidad;
  const contexto = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { request, contexto };
}

describe('CognitoAuthGuard (RF-84)', () => {
  const guard = new CognitoAuthGuard(crearVerificadorDePrueba(), () =>
    Date.now(),
  );

  afterEach(() => {
    jest.useRealTimers();
  });

  it('acepta un token válido y deja la identidad en la petición', async () => {
    const { request, contexto } = contextoCon(`Bearer ${firmarToken()}`);

    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(request.identidad).toEqual({
      idIAM: '11111111-2222-3333-4444-555555555555',
      correo: 'florencia@ejemplo.com',
      nombre: 'Florencia Pérez',
    });
  });

  it('CP-S2-23: rechaza una petición sin token', async () => {
    const { contexto } = contextoCon(undefined);

    await expect(guard.canActivate(contexto)).rejects.toThrow(
      new UnauthorizedException('No autorizado'),
    );
  });

  it('rechaza una cabecera que no es de tipo Bearer', async () => {
    const { contexto } = contextoCon(`Basic ${firmarToken()}`);

    await expect(guard.canActivate(contexto)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('CP-S2-22: rechaza un token vencido', async () => {
    const ahora = Math.floor(Date.now() / 1000);
    const vencido = firmarToken({ iat: ahora - 7200, exp: ahora - 3600 });
    const { contexto } = contextoCon(`Bearer ${vencido}`);

    await expect(guard.canActivate(contexto)).rejects.toThrow(
      new UnauthorizedException('Sesión inválida o vencida'),
    );
  });

  it('CP-S2-24: rechaza un token en el instante exacto de su vencimiento', async () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = firmarToken({ exp });
    jest.useFakeTimers({
      now: exp * 1000,
      doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'],
    });
    const { contexto } = contextoCon(`Bearer ${token}`);

    await expect(guard.canActivate(contexto)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('CP-S2-24: acepta el mismo token un segundo antes de vencer', async () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = firmarToken({ exp });
    jest.useFakeTimers({
      now: (exp - 1) * 1000,
      doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'],
    });
    const { contexto } = contextoCon(`Bearer ${token}`);

    await expect(guard.canActivate(contexto)).resolves.toBe(true);
  });

  it('rechaza un token firmado con otra clave', async () => {
    const falso = firmarToken({}, CLAVE_AJENA.privateKey);
    const { contexto } = contextoCon(`Bearer ${falso}`);

    await expect(guard.canActivate(contexto)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza un token emitido para otro cliente de aplicación', async () => {
    const { contexto } = contextoCon(
      `Bearer ${firmarToken({ aud: 'otro-cliente' })}`,
    );

    await expect(guard.canActivate(contexto)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza un token de acceso en lugar del token de ID', async () => {
    const { contexto } = contextoCon(
      `Bearer ${firmarToken({ token_use: 'access' })}`,
    );

    await expect(guard.canActivate(contexto)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza un texto que no es un token', async () => {
    const { contexto } = contextoCon('Bearer esto-no-es-un-jwt');

    await expect(guard.canActivate(contexto)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
