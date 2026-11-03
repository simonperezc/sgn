import { DataSource } from 'typeorm';
import { prepararBaseDePrueba } from './base-datos';
import { PerfilService } from '../../src/auth/perfil.service';
import { Usuario } from '../../src/nucleo/entities/usuario.entity';

describe('Sincronización del perfil local con el IAM (RF-83)', () => {
  let ds: DataSource;
  let perfil: PerfilService;
  const identidad = {
    idIAM: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    correo: 'florencia@ejemplo.com',
    nombre: 'Florencia Pérez',
  };

  beforeAll(async () => {
    ds = await prepararBaseDePrueba();
    perfil = new PerfilService(ds.getRepository(Usuario));
  });

  afterAll(async () => {
    await ds.destroy();
  });

  it('CP-S2-12: crea el perfil local con el identificador del IAM, nombre y correo', async () => {
    const usuario = await perfil.sincronizar(identidad);

    expect(usuario).toMatchObject({
      idIAM: identidad.idIAM,
      nombre: 'Florencia Pérez',
      correo: 'florencia@ejemplo.com',
    });
    expect(usuario.id).toBeDefined();
  });

  it('CP-S2-16: una segunda sincronización no crea un perfil duplicado', async () => {
    const primero = await perfil.sincronizar(identidad);
    const segundo = await perfil.sincronizar(identidad);

    expect(segundo.id).toBe(primero.id);
    expect(
      await ds.getRepository(Usuario).countBy({ idIAM: identidad.idIAM }),
    ).toBe(1);
  });

  it('CP-S2-16: dos ingresos simultáneos tampoco duplican el perfil', async () => {
    const otro = {
      ...identidad,
      idIAM: 'ffffffff-0000-1111-2222-333333333333',
    };

    const [a, b] = await Promise.all([
      perfil.sincronizar(otro),
      perfil.sincronizar(otro),
    ]);

    expect(a.id).toBe(b.id);
    expect(await ds.getRepository(Usuario).countBy({ idIAM: otro.idIAM })).toBe(
      1,
    );
  });
});
