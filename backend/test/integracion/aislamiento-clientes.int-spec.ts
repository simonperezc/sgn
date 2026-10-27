import { DataSource } from 'typeorm';
import { prepararBaseDePrueba } from './base-datos';
import { ClienteService } from '../../src/nucleo/cliente.service';
import { Usuario } from '../../src/nucleo/entities/usuario.entity';
import { Negocio } from '../../src/nucleo/entities/negocio.entity';
import { Cliente } from '../../src/nucleo/entities/cliente.entity';
import { Plantilla } from '../../src/nucleo/entities/enums';

describe('Aislamiento de clientes por negocio (RNF-6, RNF-7)', () => {
  let ds: DataSource;
  let servicio: ClienteService;
  let negocioA: Negocio;
  let negocioB: Negocio;

  beforeAll(async () => {
    ds = await prepararBaseDePrueba();
    servicio = new ClienteService(ds.getRepository(Cliente));

    const dueno = await ds
      .getRepository(Usuario)
      .save({ idIAM: 'iam-cp06', nombre: 'Dueño', correo: 'f@ejemplo.com' });
    negocioA = await ds.getRepository(Negocio).save({
      nombre: 'Negocio A',
      plantilla: Plantilla.GENERICO,
      propietarioId: dueno.id,
    });
    negocioB = await ds.getRepository(Negocio).save({
      nombre: 'Negocio B',
      plantilla: Plantilla.GENERICO,
      propietarioId: dueno.id,
    });
    const clientes = ds.getRepository(Cliente);
    await clientes.save([
      { nombre: 'Ana', telefono: '+59899000001', negocioId: negocioA.id },
      { nombre: 'Bruno', telefono: '+59899000002', negocioId: negocioA.id },
      // Mismo teléfono que Ana, pero en otro negocio: está permitido.
      { nombre: 'Carla', telefono: '+59899000001', negocioId: negocioB.id },
    ]);
  });

  afterAll(async () => {
    await ds.destroy();
  });

  it('CP-S2-06: con el contexto del negocio A solo devuelve sus clientes', async () => {
    const resultado = await servicio.listarPorNegocio(negocioA.id);

    expect(resultado.map((c) => c.nombre)).toEqual(['Ana', 'Bruno']);
    expect(resultado.every((c) => c.negocioId === negocioA.id)).toBe(true);
  });

  it('CP-S2-06: sin contexto de negocio no devuelve clientes de nadie', async () => {
    await expect(servicio.listarPorNegocio('')).rejects.toThrow(
      'Se requiere el negocio',
    );
  });
});
