import { Plantilla } from '../entities/enums';
import { panelesPorPlantilla, PANELES_NUCLEO } from './paneles';
import {
  normalizarHorario,
  validarHorario,
  validarNombre,
  validarPlantilla,
} from './negocio.validacion';

describe('Validación de datos del negocio (RF-17)', () => {
  it('CP-S3-06: un nombre compuesto solo por espacios se considera vacío y se rechaza', () => {
    expect(validarNombre('    ')?.campo).toBe('nombre');
    expect(validarNombre('Clínica Sonrisas')).toBeNull();
  });

  it.each([
    ['anterior', '18:00', '09:00'],
    ['igual', '09:00', '09:00'],
  ])(
    'CP-S3-07: rechaza un horario cuya hora de fin es %s a la de inicio',
    (_caso, inicio, fin) => {
      const error = validarHorario({ lunes: [{ inicio, fin }] });
      expect(error?.campo).toBe('horarioDisponible');
      expect(error?.mensaje).toContain('posterior');
    },
  );

  it('acepta varias franjas en un día (corte al mediodía)', () => {
    expect(
      validarHorario({
        lunes: [
          { inicio: '09:00', fin: '13:00' },
          { inicio: '15:00', fin: '19:00' },
        ],
      }),
    ).toBeNull();
  });

  it('acepta franjas contiguas y rechaza las superpuestas', () => {
    const horario = (inicio: string) => ({
      lunes: [
        { inicio: '09:00', fin: '13:00' },
        { inicio, fin: '19:00' },
      ],
    });
    expect(validarHorario(horario('13:00'))).toBeNull();
    expect(validarHorario(horario('12:59'))?.mensaje).toContain('superponen');
  });

  it.each([[undefined], [null], [{}], [{ lunes: [] }], ['09:00']])(
    'exige el horario disponible (%j)',
    (valor) => {
      expect(validarHorario(valor)?.mensaje).toContain('Definí el horario');
    },
  );

  it('rechaza días y horas con formato inválido', () => {
    const franja = [{ inicio: '09:00', fin: '18:00' }];
    expect(validarHorario({ feriado: franja })?.mensaje).toContain('no es');
    expect(
      validarHorario({ lunes: [{ inicio: '9', fin: '25:00' }] })?.mensaje,
    ).toContain('HH:MM');
  });

  it('exige una plantilla válida', () => {
    expect(validarPlantilla(undefined)?.campo).toBe('plantilla');
    expect(validarPlantilla('VETERINARIA')?.campo).toBe('plantilla');
    expect(validarPlantilla(Plantilla.GENERICO)).toBeNull();
  });

  it('el horario normalizado deja solo los días con franjas, ordenadas', () => {
    expect(
      normalizarHorario({
        lunes: [
          { inicio: '15:00', fin: '19:00' },
          { inicio: '09:00', fin: '13:00' },
        ],
        martes: [],
      }),
    ).toEqual({
      lunes: [
        { inicio: '09:00', fin: '13:00' },
        { inicio: '15:00', fin: '19:00' },
      ],
    });
  });
});

describe('Paneles por plantilla (RF-23)', () => {
  it('CP-S3-11: todas habilitan el núcleo; odontología y nutrición agregan el suyo y el genérico ninguno', () => {
    for (const plantilla of Object.values(Plantilla)) {
      expect(panelesPorPlantilla(plantilla)).toEqual(
        expect.arrayContaining([...PANELES_NUCLEO]),
      );
    }

    const odontologia = panelesPorPlantilla(Plantilla.ODONTOLOGIA);
    const nutricion = panelesPorPlantilla(Plantilla.NUTRICION);
    expect(odontologia).toContain('tratamientos');
    expect(odontologia).not.toContain('planes-alimentacion');
    expect(nutricion).toContain('planes-alimentacion');
    expect(nutricion).not.toContain('tratamientos');
    expect(panelesPorPlantilla(Plantilla.GENERICO)).toEqual([
      ...PANELES_NUCLEO,
    ]);
  });
});
