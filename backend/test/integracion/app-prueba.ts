import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { CognitoAuthGuard } from '../../src/auth/cognito-auth.guard';
import { COGNITO_VERIFIER, RELOJ } from '../../src/auth/cognito.constants';
import { OdontologiaController } from '../../src/modulos/odontologia/odontologia.controller';
import { NegocioFoto } from '../../src/nucleo/entities/negocio-foto.entity';
import { Negocio } from '../../src/nucleo/entities/negocio.entity';
import { Usuario } from '../../src/nucleo/entities/usuario.entity';
import {
  NegocioAccesoGuard,
  PlantillaGuard,
} from '../../src/nucleo/negocios/negocio-acceso.guard';
import { NegocioController } from '../../src/nucleo/negocios/negocio.controller';
import { NegocioService } from '../../src/nucleo/negocios/negocio.service';
import { ServicioController } from '../../src/nucleo/servicios/servicio.controller';
import { ServicioService } from '../../src/nucleo/servicios/servicio.service';
import { crearVerificadorDePrueba } from '../utils/tokens-cognito';

/** App real sobre la base de pruebas; solo cambia el verificador de Cognito. */
export async function crearAppDePrueba(
  ds: DataSource,
): Promise<INestApplication<App>> {
  const modulo = await Test.createTestingModule({
    controllers: [NegocioController, ServicioController, OdontologiaController],
    providers: [
      NegocioService,
      ServicioService,
      NegocioAccesoGuard,
      PlantillaGuard,
      CognitoAuthGuard,
      { provide: COGNITO_VERIFIER, useValue: crearVerificadorDePrueba() },
      { provide: RELOJ, useValue: () => Date.now() },
      { provide: getDataSourceToken(), useValue: ds },
      ...[Negocio, NegocioFoto, Usuario].map((entidad) => ({
        provide: getRepositoryToken(entidad),
        useValue: ds.getRepository(entidad),
      })),
    ],
  }).compile();
  const app = modulo.createNestApplication<INestApplication<App>>();
  await app.init();
  return app;
}
