import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { COGNITO_VERIFIER, RELOJ, type Reloj } from './cognito.constants';
import type { IdentidadIAM } from './identidad-iam';

/** Lo único que el guard necesita del verificador de aws-jwt-verify. */
export interface VerificadorToken {
  verify(token: string): Promise<Record<string, unknown>>;
}

export type RequestConIdentidad = Request & { identidad?: IdentidadIAM };

/**
 * Valida el token de Cognito en cada petición (RF-84, RNF-8): firma, emisor,
 * cliente y vencimiento. Rechaza con 401 si falta o es inválido.
 */
@Injectable()
export class CognitoAuthGuard implements CanActivate {
  constructor(
    @Inject(COGNITO_VERIFIER) private readonly verificador: VerificadorToken,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestConIdentidad>();
    const token = this.extraerToken(request);
    if (!token) {
      throw new UnauthorizedException('No autorizado');
    }

    let claims: Record<string, unknown>;
    try {
      claims = await this.verificador.verify(token);
    } catch {
      throw new UnauthorizedException('Sesión inválida o vencida');
    }

    // aws-jwt-verify acepta el token en el segundo exacto de "exp".
    // Lo tratamos como vencido (CP-S2-24).
    if (typeof claims.exp !== 'number' || claims.exp <= this.reloj() / 1000) {
      throw new UnauthorizedException('Sesión inválida o vencida');
    }

    const { sub, email, name } = claims;
    if (
      typeof sub !== 'string' ||
      typeof email !== 'string' ||
      typeof name !== 'string'
    ) {
      throw new UnauthorizedException('Sesión inválida o vencida');
    }

    request.identidad = { idIAM: sub, correo: email, nombre: name };
    return true;
  }

  private extraerToken(request: Request): string | undefined {
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];
    return tipo === 'Bearer' && token ? token : undefined;
  }
}
