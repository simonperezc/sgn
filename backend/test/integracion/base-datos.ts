import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { DataSource } from 'typeorm';
import { Usuario } from '../../src/nucleo/entities/usuario.entity';
import { Negocio } from '../../src/nucleo/entities/negocio.entity';
import { Cliente } from '../../src/nucleo/entities/cliente.entity';
import { Servicio } from '../../src/nucleo/entities/servicio.entity';
import { Turno } from '../../src/nucleo/entities/turno.entity';

// Lee backend/.env si existe, sin pisar variables ya definidas (como las del CI).
const envPath = join(__dirname, '../../.env');
if (existsSync(envPath)) {
  const variables = parseEnv(readFileSync(envPath, 'utf8'));
  for (const [clave, valor] of Object.entries(variables)) {
    process.env[clave] ??= valor;
  }
}

/**
 * Crea una conexión a la base de pruebas, la vacía y aplica las migraciones.
 * Solo acepta bases cuyo nombre termina en "_test", para no borrar nunca la de desarrollo.
 */
export async function prepararBaseDePrueba(): Promise<DataSource> {
  const database = process.env.DB_TEST_NAME ?? 'sgn_test';
  if (!database.endsWith('_test')) {
    throw new Error(`La base de pruebas debe terminar en "_test": ${database}`);
  }
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    entities: [Usuario, Negocio, Cliente, Servicio, Turno],
    migrations: [join(__dirname, '../../src/migrations/*.ts')],
  });
  await dataSource.initialize();
  await dataSource.dropDatabase();
  await dataSource.runMigrations();
  return dataSource;
}
