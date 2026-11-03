import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Carga la versión 1.0 de la cláusula de consentimiento (RF-76, RF-77).
 * Una versión publicada no se modifica: para cambiar el texto se agrega
 * otra migración con una versión nueva (RNF-15).
 */
const TEXTO_V1 = `Cláusula de consentimiento informado (versión 1.0)

Responsable: Simón Pérez, en el marco del Proyecto Integrador de la Universidad ORT Uruguay ("Sistema de gestión de negocios"). Contacto: simonpc10911@gmail.com.

Finalidad: usamos tus datos para crear y administrar tu cuenta, permitirte iniciar sesión de forma segura y gestionar tu negocio en el sistema (agenda, clientes y finanzas).

Datos que se recaban: tu nombre y tu correo electrónico. Tu contraseña y tu segundo factor de autenticación los administra el servicio de identidad; el sistema no los almacena.

Dónde se guardan: tus datos de identidad (nombre, correo y credenciales) se almacenan en Amazon Cognito, un servicio de Amazon Web Services ubicado en Estados Unidos. Al aceptar, consentís expresamente esta transferencia internacional. Los datos de tu negocio y de tus clientes se guardan en la base de datos propia del sistema.

Tus derechos: podés solicitar el acceso, la rectificación, la actualización o la supresión de tus datos, y revocar este consentimiento en cualquier momento, escribiendo al contacto indicado. La revocación no afecta los tratamientos realizados antes de ella.

Si no aceptás, no podés crear una cuenta y no se guarda ningún dato tuyo.

Marco legal: Ley N.º 18.331 de Protección de Datos Personales y Decreto N.º 414/009.`;

export class PoliticaPrivacidadV11793674166631 implements MigrationInterface {
  name = 'PoliticaPrivacidadV11793674166631';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "politica_privacidad" ("version", "texto", "vigente_desde") VALUES ($1, $2, now())`,
      ['1.0', TEXTO_V1],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "politica_privacidad" WHERE "version" = $1`,
      ['1.0'],
    );
  }
}
