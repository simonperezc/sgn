import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { Usuario } from '../nucleo/entities/usuario.entity';
import { AuthController } from './auth.controller';
import { CognitoAuthGuard } from './cognito-auth.guard';
import { COGNITO_VERIFIER, RELOJ } from './cognito.constants';
import { PerfilService } from './perfil.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  controllers: [AuthController],
  providers: [
    {
      provide: COGNITO_VERIFIER,
      inject: [ConfigService],
      // Token de ID de Cognito: trae sub, email y name, y su "aud" es el cliente.
      useFactory: (config: ConfigService) =>
        CognitoJwtVerifier.create({
          userPoolId: config.getOrThrow<string>('COGNITO_USER_POOL_ID'),
          clientId: config.getOrThrow<string>('COGNITO_CLIENT_ID'),
          tokenUse: 'id',
        }),
    },
    { provide: RELOJ, useValue: () => Date.now() },
    CognitoAuthGuard,
    PerfilService,
  ],
  exports: [CognitoAuthGuard, PerfilService, COGNITO_VERIFIER, RELOJ],
})
export class AuthModule {}
