import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { CognitoAuthGuard } from './cognito-auth.guard';
import { Identidad } from './identidad.decorator';
import type { IdentidadIAM } from './identidad-iam';
import { PerfilService } from './perfil.service';

interface SincronizarPerfilBody {
  consentimientoId?: unknown;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly perfil: PerfilService) {}

  /**
   * Perfil del usuario autenticado; lo crea en su primer ingreso (RF-83).
   * Responde 403 con código CONSENTIMIENTO_REQUERIDO si falta el consentimiento.
   */
  @Post('perfil')
  @HttpCode(200)
  @UseGuards(CognitoAuthGuard)
  async sincronizarPerfil(
    @Identidad() identidad: IdentidadIAM,
    @Body() body: SincronizarPerfilBody = {},
  ) {
    const valor = body?.consentimientoId;
    const consentimientoId = esUuid(valor) ? valor : undefined;
    const usuario = await this.perfil.sincronizar(identidad, consentimientoId);
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    };
  }
}

function esUuid(valor: unknown): valor is string {
  return (
    typeof valor === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      valor,
    )
  );
}
