import { DIAS, type DiaSemana, type Franja, type Horario } from './api'

interface Props {
  horario: Horario
  onChange: (horario: Horario) => void
}

const FRANJA_VACIA: Franja = { inicio: '', fin: '' }

/** Horario de atención por día, con una o más franjas (corte al mediodía). */
export default function HorarioEditor({ horario, onChange }: Props) {
  function cambiarDia(dia: DiaSemana, franjas: Franja[]) {
    const nuevo = { ...horario }
    if (franjas.length > 0) {
      nuevo[dia] = franjas
    } else {
      delete nuevo[dia]
    }
    onChange(nuevo)
  }

  return (
    <div className="horario">
      {DIAS.map(([dia, etiqueta]) => {
        const franjas = horario[dia] ?? []
        return (
          <div className="horario-dia" key={dia}>
            <label className="horario-abierto">
              <input
                type="checkbox"
                checked={franjas.length > 0}
                onChange={(evento) =>
                  cambiarDia(dia, evento.target.checked ? [FRANJA_VACIA] : [])
                }
              />
              {etiqueta}
            </label>
            <div className="horario-franjas">
              {franjas.map((franja, indice) => {
                const cambiar = (cambios: Partial<Franja>) =>
                  cambiarDia(
                    dia,
                    franjas.map((actual, i) =>
                      i === indice ? { ...actual, ...cambios } : actual,
                    ),
                  )
                return (
                  <div className="horario-franja" key={indice}>
                    <input
                      type="time"
                      aria-label={`${etiqueta}: hora de inicio`}
                      value={franja.inicio}
                      onChange={(evento) => cambiar({ inicio: evento.target.value })}
                    />
                    <span>a</span>
                    <input
                      type="time"
                      aria-label={`${etiqueta}: hora de fin`}
                      value={franja.fin}
                      onChange={(evento) => cambiar({ fin: evento.target.value })}
                    />
                    <button
                      type="button"
                      className="boton-texto"
                      aria-label={`Quitar franja del ${etiqueta}`}
                      onClick={() =>
                        cambiarDia(
                          dia,
                          franjas.filter((_, i) => i !== indice),
                        )
                      }
                    >
                      Quitar
                    </button>
                  </div>
                )
              })}
              {franjas.length > 0 && (
                <button
                  type="button"
                  className="boton-texto"
                  onClick={() => cambiarDia(dia, [...franjas, FRANJA_VACIA])}
                >
                  Agregar franja
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
