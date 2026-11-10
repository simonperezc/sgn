import { useEffect, useState } from 'react'
import { descargarFoto } from './api'

interface Props {
  idToken: string
  negocioId: string
}

export default function FotoNegocio({ idToken, negocioId }: Props) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    let creada: string | null = null
    descargarFoto(idToken, negocioId)
      .then((foto) => {
        if (cancelado) return
        creada = URL.createObjectURL(foto)
        setUrl(creada)
      })
      .catch((error: unknown) => {
        // Sin foto el panel sigue funcionando; el detalle queda en la consola.
        console.error('[foto]', error)
      })
    return () => {
      cancelado = true
      if (creada) URL.revokeObjectURL(creada)
    }
  }, [idToken, negocioId])

  return url ? <img className="foto-negocio" src={url} alt="Foto del negocio" /> : null
}
