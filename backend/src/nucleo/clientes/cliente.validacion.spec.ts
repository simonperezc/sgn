import { normalizarTelefono } from './telefono';
import {
  validarCorreo,
  validarNombreCliente,
  validarTelefono,
} from './cliente.validacion';

describe('Validación de clientes (RF-42, RF-44, RF-89)', () => {
  it('CP-S3-43: "099 123 456" se guarda en formato internacional', () => {
    expect(normalizarTelefono('099 123 456')).toBe('+59899123456');
  });

  it('CP-S3-45: "099123456" es el mismo teléfono que +59899123456', () => {
    expect(normalizarTelefono('099123456')).toBe(
      normalizarTelefono('+59899123456'),
    );
  });

  it('CP-S3-47: el teléfono "abc123" se rechaza con un mensaje claro', () => {
    const error = validarTelefono('abc123');
    expect(error?.campo).toBe('telefono');
    expect(error?.mensaje).toContain('teléfono uruguayo válido');
  });

  it('exige el nombre y valida el correo opcional', () => {
    expect(validarNombreCliente('  ')?.campo).toBe('nombre');
    expect(validarNombreCliente('Ana')).toBeNull();
    expect(validarCorreo('')).toBeNull();
    expect(validarCorreo('ana@ejemplo.com')).toBeNull();
    expect(validarCorreo('ana@')?.campo).toBe('correo');
  });
});
