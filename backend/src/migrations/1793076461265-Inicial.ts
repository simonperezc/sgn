import { MigrationInterface, QueryRunner } from 'typeorm';

export class Inicial1793076461265 implements MigrationInterface {
  name = 'Inicial1793076461265';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."rol" AS ENUM('USUARIO', 'ADMIN_PLATAFORMA')`,
    );
    await queryRunner.query(
      `CREATE TABLE "usuario" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "id_iam" character varying NOT NULL, "nombre" character varying NOT NULL, "correo" character varying NOT NULL, "telefono" character varying, "rol" "public"."rol" NOT NULL DEFAULT 'USUARIO', "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_cd51324c538e5f07ea99585abc2" UNIQUE ("id_iam"), CONSTRAINT "PK_a56c58e5cabaa04fb2c98d2d7e2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."estado_turno" AS ENUM('PENDIENTE_PAGO', 'CONFIRMADO', 'CANCELADO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."canal" AS ENUM('MANUAL', 'WEB', 'TELEGRAM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."resultado_turno" AS ENUM('REALIZADO', 'NO_ASISTIO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "turno" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fecha" date NOT NULL, "hora_inicio" TIME NOT NULL, "hora_fin" TIME NOT NULL, "estado" "public"."estado_turno" NOT NULL, "canal" "public"."canal" NOT NULL, "nota_cliente" text, "resultado" "public"."resultado_turno", "nota_cierre" text, "fecha_cierre" TIMESTAMP WITH TIME ZONE, "negocio_id" uuid NOT NULL, "cliente_id" uuid NOT NULL, "servicio_id" uuid NOT NULL, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0de9cfaa37f128f7e18e73d4074" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "servicio" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying NOT NULL, "duracion_min" integer NOT NULL, "precio" numeric(12,2), "negocio_id" uuid NOT NULL, CONSTRAINT "PK_a589f335f4fc94f913c9f86e608" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."plantilla" AS ENUM('GENERICO', 'ODONTOLOGIA', 'NUTRICION')`,
    );
    await queryRunner.query(
      `CREATE TABLE "negocio" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying NOT NULL, "foto" character varying, "direccion" character varying, "contacto" character varying, "horario_disponible" jsonb, "plantilla" "public"."plantilla" NOT NULL, "activo" boolean NOT NULL DEFAULT true, "propietario_id" uuid NOT NULL, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e70f1c8b468e32882bff529cb67" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "cliente" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying NOT NULL, "telefono" character varying(20) NOT NULL, "correo" character varying, "telegram_chat_id" character varying, "notas" text, "negocio_id" uuid NOT NULL, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_cliente_negocio_telefono" UNIQUE ("negocio_id", "telefono"), CONSTRAINT "PK_18990e8df6cf7fe71b9dc0f5f39" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "turno" ADD CONSTRAINT "FK_1812f93f535bf4dad95d54e8928" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "turno" ADD CONSTRAINT "FK_84601d74287bc21a69645dfe317" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "turno" ADD CONSTRAINT "FK_856087a1e2347af9164b74cb507" FOREIGN KEY ("servicio_id") REFERENCES "servicio"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "servicio" ADD CONSTRAINT "FK_1a2c7b726255c8c145911600b5f" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "negocio" ADD CONSTRAINT "FK_3c59f16bc151bee8389e4a7f2a5" FOREIGN KEY ("propietario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cliente" ADD CONSTRAINT "FK_431e3d26589e7198d893604f164" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cliente" DROP CONSTRAINT "FK_431e3d26589e7198d893604f164"`,
    );
    await queryRunner.query(
      `ALTER TABLE "negocio" DROP CONSTRAINT "FK_3c59f16bc151bee8389e4a7f2a5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "servicio" DROP CONSTRAINT "FK_1a2c7b726255c8c145911600b5f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "turno" DROP CONSTRAINT "FK_856087a1e2347af9164b74cb507"`,
    );
    await queryRunner.query(
      `ALTER TABLE "turno" DROP CONSTRAINT "FK_84601d74287bc21a69645dfe317"`,
    );
    await queryRunner.query(
      `ALTER TABLE "turno" DROP CONSTRAINT "FK_1812f93f535bf4dad95d54e8928"`,
    );
    await queryRunner.query(`DROP TABLE "cliente"`);
    await queryRunner.query(`DROP TABLE "negocio"`);
    await queryRunner.query(`DROP TYPE "public"."plantilla"`);
    await queryRunner.query(`DROP TABLE "servicio"`);
    await queryRunner.query(`DROP TABLE "turno"`);
    await queryRunner.query(`DROP TYPE "public"."resultado_turno"`);
    await queryRunner.query(`DROP TYPE "public"."canal"`);
    await queryRunner.query(`DROP TYPE "public"."estado_turno"`);
    await queryRunner.query(`DROP TABLE "usuario"`);
    await queryRunner.query(`DROP TYPE "public"."rol"`);
  }
}
