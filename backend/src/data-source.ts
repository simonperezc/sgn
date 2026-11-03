import { DataSource } from 'typeorm';
import { existsSync } from 'node:fs';
import { opcionesSsl } from './config/ssl';

if (existsSync('.env')) {
  process.loadEnvFile();
}

/** Configuración que usa el CLI de TypeORM para generar y ejecutar migraciones. */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: opcionesSsl(process.env.DB_SSL),
  entities: [__dirname + '/**/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
});
