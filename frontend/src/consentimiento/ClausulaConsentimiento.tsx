import { useEffect, useState } from 'react'
import {
  aceptarConsentimiento,
  obtenerPoliticaVigente,
  type PoliticaPrivacidad,
} from '../auth/api'

interface Props {
  /** Se llama con el id del consentimiento ya registrado en el backend. */
  onAceptado: (consentimientoId: string) => void
  /** Rechazar no llama al backend: no se guarda ningún dato (RF-79). */
  onRechazar: () => void
}

/** Cláusula de consentimiento informado (CU 2 · RF-76, RF-77, RF-78). */
export default function ClausulaConsentimiento({ onAceptado, onRechazar }: Props) {
  const [politica, setPolitica] = useState<PoliticaPrivacidad | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    obtenerPoliticaVigente()
      .then(setPolitica)
      .catch(() => setError('No pudimos cargar la cláusula. Probá de nuevo en unos minutos.'))
  }, [])

  async function aceptar() {
    if (!politica) return
    setEnviando(true)
    try {
      // Se envía la versión que se está mostrando (CP-S2-10).
      onAceptado(await aceptarConsentimiento(politica.id))
    } catch {
      setError('No pudimos registrar tu aceptación. Probá de nuevo.')
      setEnviando(false)
    }
  }

  if (error) {
    return (
      <section>
        <p role="alert">{error}</p>
        <button onClick={onRechazar}>Volver</button>
      </section>
    )
  }

  if (!politica) {
    return <p>Cargando la cláusula…</p>
  }

  return (
    <section aria-labelledby="titulo-clausula">
      <h2 id="titulo-clausula">Consentimiento informado</h2>
      <p>Versión {politica.version}</p>
      <div style={{ whiteSpace: 'pre-wrap', maxWidth: '70ch' }}>{politica.texto}</div>
      <p>
        <button onClick={() => void aceptar()} disabled={enviando}>
          Aceptar
        </button>{' '}
        <button onClick={onRechazar} disabled={enviando}>
          Rechazar
        </button>
      </p>
    </section>
  )
}
