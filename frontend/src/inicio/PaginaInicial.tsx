import { useState } from 'react'
import AltaNegocio from '../negocios/AltaNegocio'
import type { DatosNuevoNegocio, Plantilla } from '../negocios/api'
import { borrarBorrador, guardarBorrador, leerBorrador } from '../negocios/borrador'
import { nombrePlantilla, PLANTILLAS } from '../negocios/plantillas'
import '../negocios/negocios.css'

interface Props {
  aviso: string | null
  onIniciarSesion: () => void
  /** Muestra la cláusula de consentimiento y luego el registro en Cognito. */
  onCrearCuenta: () => void
}

type Paso =
  | { tipo: 'plantillas' }
  | { tipo: 'datos'; plantilla?: Plantilla; borrador?: DatosNuevoNegocio }
  | { tipo: 'cuenta'; borrador: DatosNuevoNegocio }

function pasoInicial(): Paso {
  const borrador = leerBorrador()
  return borrador ? { tipo: 'cuenta', borrador } : { tipo: 'plantillas' }
}

/** Página inicial sin sesión: plantillas y registro desde una plantilla (CU 23). */
export default function PaginaInicial({ aviso, onIniciarSesion, onCrearCuenta }: Props) {
  const [paso, setPaso] = useState<Paso>(pasoInicial)

  const accesos = (
    <div className="acciones">
      <button onClick={onIniciarSesion}>Iniciar sesión</button>
      <button onClick={onCrearCuenta}>Crear cuenta</button>
    </div>
  )

  return (
    <main className="area">
      <h1>Sistema de gestión de negocios</h1>
      {aviso && <p role="alert">{aviso}</p>}

      {paso.tipo === 'plantillas' && (
        <section>
          {accesos}
          <h2>Elegí la plantilla de tu negocio</h2>
          <p>
            Configurá tu negocio en unos minutos. Al final creás tu cuenta y queda registrado.
          </p>
          <ul className="plantillas">
            {PLANTILLAS.map((opcion) => (
              <li key={opcion.valor}>
                <h3>{opcion.nombre}</h3>
                <p>{opcion.detalle}</p>
                <p className="funciones">{opcion.funciones.join(' · ')}</p>
                <button onClick={() => setPaso({ tipo: 'datos', plantilla: opcion.valor })}>
                  Empezar con {opcion.nombre}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {paso.tipo === 'datos' && (
        <AltaNegocio
          plantillaInicial={paso.plantilla}
          datosIniciales={paso.borrador}
          textoConfirmar="Continuar"
          onCancelar={() => setPaso({ tipo: 'plantillas' })}
          onConfirmar={async (datos) => {
            // CU 23, paso 6: los datos quedan en el navegador, no en el servidor.
            guardarBorrador(datos)
            setPaso({ tipo: 'cuenta', borrador: datos })
          }}
        />
      )}

      {paso.tipo === 'cuenta' && (
        <section className="formulario">
          <h2>Último paso: tu cuenta</h2>
          <p className="aviso">
            <strong>{paso.borrador.nombre}</strong> · {nombrePlantilla(paso.borrador.plantilla)}
          </p>
          <p>
            Tu negocio se registra cuando termines de crear tu cuenta o de iniciar sesión. Hasta
            entonces, los datos quedan solo en este navegador.
          </p>
          <div className="acciones">
            <button onClick={onCrearCuenta}>Crear cuenta</button>
            <button onClick={onIniciarSesion}>Ya tengo cuenta</button>
          </div>
          <div className="acciones">
            <button
              className="boton-texto"
              onClick={() => setPaso({ tipo: 'datos', borrador: paso.borrador })}
            >
              Modificar datos del negocio
            </button>
            <button
              className="boton-texto"
              onClick={() => {
                borrarBorrador()
                setPaso({ tipo: 'plantillas' })
              }}
            >
              Descartar
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
