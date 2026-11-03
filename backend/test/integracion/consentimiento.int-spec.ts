import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { prepararBaseDePrueba } from './base-datos';
import { ConsentimientoService } from '../../src/consentimiento/consentimiento.service';
import { ConsentimientoInformado } from '../../src/consentimiento/entities/consentimiento-informado.entity';
import { EstadoConsentimiento } from '../../src/consentimiento/entities/estado-consentimiento';
import { PoliticaPrivacidad } from '../../src/consentimiento/entities/politica-privacidad.entity';

describe('Consentimiento informado (CU 2)', () => {
  let ds: DataSource;
  let servicio: ConsentimientoService;

  beforeAll(async () => {
    ds = await prepararBaseDePrueba();
    servicio = new ConsentimientoService(
      ds.getRepository(PoliticaPrivacidad),
      ds.getRepository(ConsentimientoInformado),
    );
  });

  afterAll(async () => {
    await ds.destroy();
  });

  it('CP-S2-07: la política vigente informa la finalidad del tratamiento de los datos', async () => {
    const politica = await servicio.obtenerPoliticaVigente();

    expect(politica.version).toBe('1.0');
    expect(politica.texto).toContain('Finalidad:');
    expect(politica.texto).toContain('Estados Unidos');
  });

  it('CP-S2-07 / CP-S2-08: al aceptar registra fecha y hora, versión de la política y estado vigente', async () => {
    const antes = Date.now();
    const politica = await servicio.obtenerPoliticaVigente();

    const consentimiento = await servicio.registrarAceptacion(politica.id);

    const guardado = await ds
      .getRepository(ConsentimientoInformado)
      .findOneOrFail({
        where: { id: consentimiento.id },
        relations: { politica: true },
      });
    expect(guardado.politica.version).toBe('1.0');
    expect(guardado.estado).toBe(EstadoConsentimiento.ACEPTADO);
    expect(guardado.fechaHora.getTime()).toBeGreaterThanOrEqual(antes - 1000);
    expect(guardado.fechaHora.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    expect(guardado.fechaRevocacion).toBeNull();
    // Todavía no hay usuario: se vincula al crear el perfil local.
    expect(guardado.usuarioId).toBeNull();
  });

  it('CP-S2-10: si se publica otra versión mientras la cláusula está abierta, registra la que el usuario vio', async () => {
    const vista = await servicio.obtenerPoliticaVigente();
    await ds.getRepository(PoliticaPrivacidad).save({
      version: '2.0-prueba',
      texto: 'Texto de una versión nueva',
      vigenteDesde: new Date(),
    });
    expect((await servicio.obtenerPoliticaVigente()).version).toBe(
      '2.0-prueba',
    );

    const consentimiento = await servicio.registrarAceptacion(vista.id);

    expect(consentimiento.politica.version).toBe(vista.version);
  });

  it('rechaza una versión de la política que no existe', async () => {
    await expect(
      servicio.registrarAceptacion('00000000-0000-4000-8000-000000000000'),
    ).rejects.toThrow(NotFoundException);
  });
});
