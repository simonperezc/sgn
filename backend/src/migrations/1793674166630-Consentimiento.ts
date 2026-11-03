import { MigrationInterface, QueryRunner } from 'typeorm';

export class Consentimiento1793674166630 implements MigrationInterface {
  name = 'Consentimiento1793674166630';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "politica_privacidad" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "version" character varying NOT NULL, "texto" text NOT NULL, "vigente_desde" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "UQ_13f60b9d41aef1463b472ae99b9" UNIQUE ("version"), CONSTRAINT "PK_dd109ac9879abad6414343c25da" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."estado_consentimiento" AS ENUM('ACEPTADO', 'REVOCADO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "consentimiento_informado" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "politica_id" uuid NOT NULL, "usuario_id" uuid, "estado" "public"."estado_consentimiento" NOT NULL DEFAULT 'ACEPTADO', "fecha_hora" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_revocacion" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_7481f34411f321737a73961c9f5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "consentimiento_informado" ADD CONSTRAINT "FK_9d73bd2c59a87fe86decce428ff" FOREIGN KEY ("politica_id") REFERENCES "politica_privacidad"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "consentimiento_informado" ADD CONSTRAINT "FK_385451fbf18461db3692058b5a5" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "consentimiento_informado" DROP CONSTRAINT "FK_385451fbf18461db3692058b5a5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consentimiento_informado" DROP CONSTRAINT "FK_9d73bd2c59a87fe86decce428ff"`,
    );
    await queryRunner.query(`DROP TABLE "consentimiento_informado"`);
    await queryRunner.query(`DROP TYPE "public"."estado_consentimiento"`);
    await queryRunner.query(`DROP TABLE "politica_privacidad"`);
  }
}
