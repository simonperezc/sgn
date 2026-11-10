import { validarDuracion, validarNombreServicio } from './servicio.validacion';

describe('Validación de servicios (RF-19)', () => {
  it.each([[0], [-15]])('CP-S3-22: la duración %i se rechaza', (duracion) => {
    expect(validarDuracion(duracion)?.campo).toBe('duracionMin');
  });

  it.each([[null], [undefined], ['']])('exige la duración (%j)', (valor) => {
    expect(validarDuracion(valor)?.mensaje).toContain('Ingresá');
  });

  it('rechaza una duración no entera y acepta una válida', () => {
    expect(validarDuracion(1.5)?.campo).toBe('duracionMin');
    expect(validarDuracion(30)).toBeNull();
  });

  it('exige el nombre', () => {
    expect(validarNombreServicio('   ')?.campo).toBe('nombre');
    expect(validarNombreServicio('Consulta')).toBeNull();
  });
});
