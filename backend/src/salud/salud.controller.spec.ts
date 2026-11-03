import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SaludController } from './salud.controller';

describe('SaludController (CP-S2-03)', () => {
  it('responde ok cuando la base contesta', async () => {
    const ds = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const controlador = new SaludController(ds as unknown as DataSource);

    await expect(controlador.comprobar()).resolves.toEqual({ estado: 'ok' });
  });

  it('responde 503 sin detalles técnicos cuando la base no contesta', async () => {
    const ds = {
      query: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    };
    const controlador = new SaludController(ds as unknown as DataSource);

    await expect(controlador.comprobar()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
