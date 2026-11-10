import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NucleoModule } from './nucleo/nucleo.module';
import { AuthModule } from './auth/auth.module';
import { ConsentimientoModule } from './consentimiento/consentimiento.module';
import { SaludModule } from './salud/salud.module';
import { NegociosModule } from './nucleo/negocios/negocios.module';
import { ServiciosModule } from './nucleo/servicios/servicios.module';
import { OdontologiaModule } from './modulos/odontologia/odontologia.module';
import { opcionesSsl } from './config/ssl';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('DB_HOST'),
        port: Number(config.getOrThrow<string>('DB_PORT')),
        database: config.getOrThrow<string>('DB_NAME'),
        username: config.getOrThrow<string>('DB_USER'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        ssl: opcionesSsl(config.get<string>('DB_SSL')),
        autoLoadEntities: true,
        synchronize: false,
        migrations: [__dirname + '/migrations/*.js'],
        migrationsRun: config.get<string>('DB_MIGRATIONS_RUN') === 'true',
      }),
    }),
    NucleoModule,
    ConsentimientoModule,
    AuthModule,
    NegociosModule,
    ServiciosModule,
    OdontologiaModule,
    SaludModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
