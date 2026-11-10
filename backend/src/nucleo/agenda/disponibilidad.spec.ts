import {
  ahoraEnUruguay,
  aHora,
  aMinutos,
  dentroDelHorario,
  diaDeLaSemana,
  seSuperponen,
} from './disponibilidad';

describe('Cálculos de agenda', () => {
  it('convierte horas de PostgreSQL y minutos', () => {
    expect(aMinutos('10:45:00')).toBe(645);
    expect(aHora(645)).toBe('10:45');
  });

  it('calcula el día de la semana', () => {
    expect(diaDeLaSemana('2026-11-09')).toBe('lunes');
    expect(diaDeLaSemana('2026-11-15')).toBe('domingo');
  });

  it('dos rangos contiguos no se superponen', () => {
    const a = { inicio: 600, fin: 630 };
    expect(seSuperponen(a, { inicio: 630, fin: 660 })).toBe(false);
    expect(seSuperponen(a, { inicio: 615, fin: 645 })).toBe(true);
  });

  it('el turno debe entrar entero en una franja', () => {
    const horario = { lunes: [{ inicio: '09:00', fin: '13:00' }] };
    expect(
      dentroDelHorario(horario, '2026-11-09', { inicio: 720, fin: 780 }),
    ).toBe(true);
    expect(
      dentroDelHorario(horario, '2026-11-09', { inicio: 750, fin: 810 }),
    ).toBe(false);
    expect(
      dentroDelHorario(horario, '2026-11-10', { inicio: 720, fin: 780 }),
    ).toBe(false);
  });

  it('usa la hora de Uruguay', () => {
    expect(ahoraEnUruguay(new Date('2026-11-10T01:30:00Z'))).toEqual({
      fecha: '2026-11-09',
      hora: '22:30',
    });
  });
});
