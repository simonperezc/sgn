import { normalizarTelefono } from './telefono';

describe('Normalización de teléfonos (RF-89, RF-91)', () => {
  it('CP-S3-55: "099 123 456" y "+598 99 123 456" corresponden al mismo cliente', () => {
    expect(normalizarTelefono('099 123 456')).toBe('+59899123456');
    expect(normalizarTelefono('+598 99 123 456')).toBe('+59899123456');
  });

  it.each([
    ['099-123-456', '+59899123456'],
    ['00598 99 123 456', '+59899123456'],
    ['59899123456', '+59899123456'],
    ['2901 2345', '+59829012345'],
    ['(4) 234 5678', '+59842345678'],
    ['+598 2901 2345', '+59829012345'],
  ])('normaliza %s', (entrada, esperado) => {
    expect(normalizarTelefono(entrada)).toBe(esperado);
  });

  it.each([
    ['123'],
    ['099 123 45'],
    ['0991234567'],
    ['+54 11 1234 5678'],
    ['39012345'],
    ['abc'],
    [''],
    [null],
  ])('rechaza %j', (entrada) => {
    expect(normalizarTelefono(entrada)).toBeNull();
  });
});
