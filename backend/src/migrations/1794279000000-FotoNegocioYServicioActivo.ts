import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RF-18: la foto se guarda en su propia tabla y reemplaza a negocio.foto.
 * CP-S3-24: baja lógica de servicios (los turnos históricos los referencian).
 */
export class FotoNegocioYServicioActivo1794279000000 implements MigrationInterface {
  name = 'FotoNegocioYServicioActivo1794279000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "negocio_foto" ("negocio_id" uuid NOT NULL, "tipo" character varying NOT NULL, "datos" bytea NOT NULL, "actualizada_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_negocio_foto" PRIMARY KEY ("negocio_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "negocio_foto" ADD CONSTRAINT "FK_3d1795e4a868f02984fb8d9c8d5" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "negocio" DROP COLUMN "foto"`);
    await queryRunner.query(
      `ALTER TABLE "servicio" ADD "activo" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "servicio" DROP COLUMN "activo"`);
    await queryRunner.query(
      `ALTER TABLE "negocio" ADD "foto" character varying`,
    );
    await queryRunner.query(`DROP TABLE "negocio_foto"`);
  }
}
