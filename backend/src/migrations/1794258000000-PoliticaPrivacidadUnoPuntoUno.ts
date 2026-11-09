import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Publica la versión 1.1 de la cláusula: informa que todos los datos se alojan
 * en Estados Unidos (AWS y Microsoft Azure). La versión 1.0 no se modifica (RNF-15).
 *
 * La vigencia es now() + 1 microsegundo: now() es la hora de inicio de la
 * transacción y, si esta migración corre junto con la de la 1.0, sin ese
 * microsegundo las dos tendrían la misma fecha. No se usa clock_timestamp()
 * porque daría una hora casi igual a la de la primera consulta, y un reloj de
 * la aplicación apenas atrasado (en Windows) dejaría a la 1.1 como aún no vigente.
 */
const TEXTO_V1_1 = `Cláusula de consentimiento informado (versión 1.1)

Responsable: Simón Pérez, en el marco del Proyecto Integrador de la Universidad ORT Uruguay ("Sistema de gestión de negocios"). Contacto: simonpc10911@gmail.com.

Finalidad: usamos tus datos para crear y administrar tu cuenta, permitirte iniciar sesión de forma segura y gestionar tu negocio en el sistema (agenda, clientes y finanzas).

Datos que se recaban: tu nombre, tu correo electrónico y los datos que cargues sobre tu negocio y tus clientes. Tu contraseña y tu segundo factor de autenticación los administra el servicio de identidad; el sistema no los almacena.

Dónde se guardan: todos los datos se almacenan en Estados Unidos, en servicios de terceros. Tus datos de identidad (nombre, correo y credenciales) se guardan en Amazon Cognito, de Amazon Web Services. Los datos de tu negocio y de tus clientes, incluida la información clínica que registres, se guardan en Microsoft Azure. Al aceptar, consentís expresamente esta transferencia internacional.

Tus derechos: podés solicitar el acceso, la rectificación, la actualización o la supresión de tus datos, y revocar este consentimiento en cualquier momento, escribiendo al contacto indicado. La revocación no afecta los tratamientos realizados antes de ella.

Si no aceptás, no podés crear una cuenta y no se guarda ningún dato tuyo.

Marco legal: Ley N.º 18.331 de Protección de Datos Personales y Decreto N.º 414/009.`;

export class PoliticaPrivacidadUnoPuntoUno1794258000000 implements MigrationInterface {
  name = 'PoliticaPrivacidadUnoPuntoUno1794258000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "politica_privacidad" ("version", "texto", "vigente_desde") VALUES ($1, $2, now() + interval '1 microsecond')`,
      ['1.1', TEXTO_V1_1],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "politica_privacidad" WHERE "version" = $1`,
      ['1.1'],
    );
  }
}
