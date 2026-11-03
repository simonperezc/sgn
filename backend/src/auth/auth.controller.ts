import { Controller, Get, UseGuards } from '@nestjs/common';
import { CognitoAuthGuard } from './cognito-auth.guard';
import { Identidad } from './identidad.decorator';
import type { IdentidadIAM } from './identidad-iam';
import { PerfilService } from './perfil.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly perfil: PerfilService) {}

  /** Perfil del usuario autenticado; lo crea en su primer ingreso (RF-83). */
  @Get('perfil')
  @UseGuards(CognitoAuthGuard)
  async obtenerPerfil(@Identidad() identidad: IdentidadIAM) {
    const usuario = await this.perfil.sincronizar(identidad);
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    };
  }
}
