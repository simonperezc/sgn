import {
  motivoNoDisponible,
  rangoDelTurno,
  sugerirHorarios,
  validarFecha,
  validarHora,
} from './turno.validacion';

// 2026-11-09 es lunes.
const LUNES = '2026-11-09';
const HORARIO = { lunes: [{ inicio: '09:00', fin: '18:00' }] };
const DE_10_A_1030 = [{ id: 'existente', inicio: 600, fin: 630 }];

describe('Disponibilidad de turnos (RF-24, RF-25)', () => {
  it('CP-S3-27: un turno de 45 minutos que inicia a las 10:00 ocupa hasta las 10:45', () => {
    expect(rangoDelTurno('10:00', 45)).toEqual({ inicio: 600, fin: 645 });
  });

  it('CP-S3-29: un turno de 10:15 a 10:45 no está disponible por superposición parcial', () => {
    expect(
      motivoNoDisponible(
        HORARIO,
        LUNES,
        rangoDelTurno('10:15', 30),
        DE_10_A_1030,
      ),
    ).toBe('OCUPADO');
  });

  it('CP-S3-30: un turno que empieza justo cuando termina el anterior está disponible', () => {
    expect(
      motivoNoDisponible(
        HORARIO,
        LUNES,
        rangoDelTurno('10:30', 30),
        DE_10_A_1030,
      ),
    ).toBeNull();
  });

  it('CP-S3-31: un turno a las 08:30 está fuera del horario de atención', () => {
    expect(
      motivoNoDisponible(HORARIO, LUNES, rangoDelTurno('08:30', 30), []),
    ).toBe('FUERA_DE_HORARIO');
  });

  it('CP-S3-32: con atención hasta las 18:00, 17:30 se acepta y 17:45 se rechaza', () => {
    expect(
      motivoNoDisponible(HORARIO, LUNES, rangoDelTurno('17:30', 30), []),
    ).toBeNull();
    expect(
      motivoNoDisponible(HORARIO, LUNES, rangoDelTurno('17:45', 30), []),
    ).toBe('FUERA_DE_HORARIO');
  });

  it('CP-S3-37: al editar, el turno no se considera en conflicto consigo mismo', () => {
    expect(
      motivoNoDisponible(
        HORARIO,
        LUNES,
        rangoDelTurno('10:00', 30),
        DE_10_A_1030,
        'existente',
      ),
    ).toBeNull();
  });

  it('sugiere los horarios libres más cercanos al pedido', () => {
    expect(sugerirHorarios(HORARIO, LUNES, 30, DE_10_A_1030, 600)).toEqual([
      '09:15',
      '09:30',
      '10:30',
    ]);
  });

  it('no sugiere horarios anteriores a "desde" ni días sin atención', () => {
    expect(
      sugerirHorarios(HORARIO, LUNES, 30, [], 540, { desde: 17 * 60 }),
    ).toEqual(['17:00', '17:15', '17:30']);
    expect(sugerirHorarios(HORARIO, '2026-11-10', 30, [], 600)).toEqual([]);
  });

  it('valida el formato de fecha y hora', () => {
    expect(validarFecha('2026-02-30')?.campo).toBe('fecha');
    expect(validarFecha(LUNES)).toBeNull();
    expect(validarHora('9:00')?.campo).toBe('horaInicio');
    expect(validarHora('09:00')).toBeNull();
  });
});
