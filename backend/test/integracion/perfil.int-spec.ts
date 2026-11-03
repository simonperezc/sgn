import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { prepararBaseDePrueba } from './base-datos';
import { PerfilService } from '../../src/auth/perfil.service';
import { ConsentimientoService } from '../../src/consentimiento/consentimiento.service';
import { ConsentimientoInformado } from '../../src/consentimiento/entities/consentimiento-informado.entity';
import { PoliticaPrivacidad } from '../../src/consentimiento/entities/politica-privacidad.entity';
import { Usuario } from '../../src/nucleo/entities/usuario.entity';

describe('Sincronización del perfil local con el IAM (RF-83, RF-79)', () => {
  let ds: DataSource;
  let perfil: PerfilService;
  let consentimientos: ConsentimientoService;

  const identidad = (idIAM: string) => ({
    idIAM,
    correo: `${idIAM}@ejemplo.com`,
    nombre: 'Florencia Pérez',
  });

  async function aceptarConsentimiento(): Promise<string> {
    const politica = await consentimientos.obtenerPoliticaVigente();
    return (await consentimientos.registrarAceptacion(politica.id)).id;
  }

  beforeAll(async () => {
    ds = await prepararBaseDePrueba();
    perfil = new PerfilService(ds);
    consentimientos = new ConsentimientoService(
      ds.getRepository(PoliticaPrivacidad),
      ds.getRepository(ConsentimientoInformado),
    );
  });

  afterAll(async () => {
    await ds.destroy();
  });

  it('CP-S2-12: crea el perfil local con el identificador del IAM, nombre y correo, y le vincula el consentimiento', async () => {
    const consentimientoId = await aceptarConsentimiento();

    const usuario = await perfil.sincronizar(
      identidad('iam-cp12'),
      consentimientoId,
    );

    expect(usuario).toMatchObject({
      idIAM: 'iam-cp12',
      nombre: 'Florencia Pérez',
      correo: 'iam-cp12@ejemplo.com',
    });
    const consentimiento = await ds
      .getRepository(ConsentimientoInformado)
      .findOneByOrFail({ id: consentimientoId });
    expect(consentimiento.usuarioId).toBe(usuario.id);
  });

  it('CP-S2-16: una segunda sincronización no crea un perfil duplicado (ni pide de nuevo el consentimiento)', async () => {
    const consentimientoId = await aceptarConsentimiento();
    const primero = await perfil.sincronizar(
      identidad('iam-cp16'),
      consentimientoId,
    );

    const segundo = await perfil.sincronizar(identidad('iam-cp16'));

    expect(segundo.id).toBe(primero.id);
    expect(await ds.getRepository(Usuario).countBy({ idIAM: 'iam-cp16' })).toBe(
      1,
    );
  });

  it('CP-S2-16: dos ingresos simultáneos tampoco duplican el perfil', async () => {
    const consentimientoId = await aceptarConsentimiento();

    const [a, b] = await Promise.all([
      perfil.sincronizar(identidad('iam-cp16-b'), consentimientoId),
      perfil.sincronizar(identidad('iam-cp16-b'), consentimientoId),
    ]);

    expect(a.id).toBe(b.id);
    expect(
      await ds.getRepository(Usuario).countBy({ idIAM: 'iam-cp16-b' }),
    ).toBe(1);
  });

  it('CP-S2-09: sin consentimiento aceptado no guarda ningún dato personal', async () => {
    await expect(perfil.sincronizar(identidad('iam-cp09'))).rejects.toThrow(
      ForbiddenException,
    );

    expect(await ds.getRepository(Usuario).countBy({ idIAM: 'iam-cp09' })).toBe(
      0,
    );
  });

  it('rechaza un consentimiento que no existe', async () => {
    await expect(
      perfil.sincronizar(
        identidad('iam-inexistente'),
        '00000000-0000-4000-8000-000000000000',
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(
      await ds.getRepository(Usuario).countBy({ idIAM: 'iam-inexistente' }),
    ).toBe(0);
  });

  it('no permite usar el consentimiento de otra persona', async () => {
    const consentimientoId = await aceptarConsentimiento();
    await perfil.sincronizar(identidad('iam-dueno'), consentimientoId);

    await expect(
      perfil.sincronizar(identidad('iam-otro'), consentimientoId),
    ).rejects.toThrow(ForbiddenException);
    expect(await ds.getRepository(Usuario).countBy({ idIAM: 'iam-otro' })).toBe(
      0,
    );
  });
});
