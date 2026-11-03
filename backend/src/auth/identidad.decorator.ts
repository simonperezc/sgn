import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestConIdentidad } from './cognito-auth.guard';

/** Inyecta en el controlador la identidad que dejó CognitoAuthGuard. */
export const Identidad = createParamDecorator(
  (_dato: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<RequestConIdentidad>().identidad,
);
