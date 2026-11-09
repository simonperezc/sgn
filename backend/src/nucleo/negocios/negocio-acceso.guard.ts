import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RequestConIdentidad } from '../../auth/cognito-auth.guard';
import { Negocio } from '../entities/negocio.entity';
import { Plantilla } from '../entities/enums';

export type RequestConNegocio = RequestConIdentidad & { negocio?: Negocio };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Aislamiento entre negocios (RNF-6, RNF-7): se usa después de CognitoAuthGuard
 * en las rutas /negocios/:negocioId y deja el negocio en la petición. Por ahora
 * solo entra el dueño; los empleados se suman en su sprint.
 */
@Injectable()
export class NegocioAccesoGuard implements CanActivate {
  constructor(
    @InjectRepository(Negocio)
    private readonly negocios: Repository<Negocio>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestConNegocio>();
    const negocioId = request.params.negocioId;
    if (typeof negocioId !== 'string' || !UUID.test(negocioId)) {
      throw new NotFoundException('El negocio no existe');
    }

    const negocio = await this.negocios.findOne({
      where: { id: negocioId },
      relations: { propietario: true },
    });
    if (!negocio) {
      throw new NotFoundException('El negocio no existe');
    }
    if (negocio.propietario.idIAM !== request.identidad?.idIAM) {
      throw new ForbiddenException('No tenés acceso a este negocio');
    }

    request.negocio = negocio;
    return true;
  }
}

/** Inyecta en el controlador el negocio que validó NegocioAccesoGuard. */
export const NegocioActual = createParamDecorator(
  (_dato: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<RequestConNegocio>().negocio,
);

const CLAVE_PLANTILLA = 'plantilla-requerida';

/** Marca una ruta como exclusiva de un módulo de rubro (RF-85, RNF-25). */
export const RequierePlantilla = (plantilla: Plantilla) =>
  SetMetadata(CLAVE_PLANTILLA, plantilla);

/** Rechaza los recursos de un módulo que la plantilla del negocio no habilita. */
@Injectable()
export class PlantillaGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requerida = this.reflector.getAllAndOverride<Plantilla | undefined>(
      CLAVE_PLANTILLA,
      [context.getHandler(), context.getClass()],
    );
    const { negocio } = context.switchToHttp().getRequest<RequestConNegocio>();
    if (requerida && negocio?.plantilla !== requerida) {
      throw new ForbiddenException(
        'Este módulo no está habilitado para el negocio',
      );
    }
    return true;
  }
}
