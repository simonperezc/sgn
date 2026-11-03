import { opcionesSsl } from './ssl';

describe('opcionesSsl (RNF-2)', () => {
  it('con DB_SSL=true cifra y valida el certificado del servidor', () => {
    expect(opcionesSsl('true')).toEqual({ rejectUnauthorized: true });
  });

  it('sin DB_SSL, o con otro valor, no usa TLS (local y CI)', () => {
    expect(opcionesSsl(undefined)).toBe(false);
    expect(opcionesSsl('false')).toBe(false);
  });
});
