import { useState } from 'react'
import { api } from '../api'
import ResultadoTalla from '../components/ResultadoTalla'

const MEDIDAS = [
  { key: 'pecho', label: 'Pecho', unit: 'cm', hint: 'Contorno de pecho' },
  { key: 'cintura', label: 'Cintura', unit: 'cm', hint: 'Contorno de cintura' },
  { key: 'cadera', label: 'Cadera', unit: 'cm', hint: 'Contorno de cadera' },
  { key: 'largo_manga', label: 'Largo de manga', unit: 'cm', hint: 'Hombro a muñeca' },
  { key: 'largo_pantalon', label: 'Largo de pantalón', unit: 'cm', hint: 'Cadera a tobillo' },
]

const EMPTY_FORM = {
  nombre: '',
  dni: '',
  pecho: '',
  cintura: '',
  cadera: '',
  largo_manga: '',
  largo_pantalon: '',
}

/** Paso de revisión (0 = cliente, 1..N = medidas, último = revisión) */
const REVIEW_STEP = 1 + MEDIDAS.length
const TOTAL_STEPS = REVIEW_STEP + 1

export default function NuevaMedicion() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [step, setStep] = useState(0)
  const [personaId, setPersonaId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    setError(null)

    for (const campo of ['nombre', 'dni', ...MEDIDAS.map(m => m.key)]) {
      if (!form[campo]?.toString().trim()) {
        const label =
          campo === 'nombre'
            ? 'Nombre completo'
            : campo === 'dni'
              ? 'DNI'
              : MEDIDAS.find(m => m.key === campo)?.label ?? campo
        setError(`Completa el campo: ${label}`)
        return
      }
    }

    setLoading(true)
    try {
      let pid = personaId
      if (!pid) {
        const persona = await api.crearPersona({ nombre: form.nombre.trim(), dni: form.dni.trim() })
        pid = persona.id
        setPersonaId(pid)
      }

      const res = await api.crearMedicion({
        persona_id: pid,
        pecho: parseFloat(form.pecho),
        cintura: parseFloat(form.cintura),
        cadera: parseFloat(form.cadera),
        largo_manga: parseFloat(form.largo_manga),
        largo_pantalon: parseFloat(form.largo_pantalon),
      })
      if (res.persona_id != null) setPersonaId(res.persona_id)
      setResultado(res)
    } catch (e) {
      console.error(e)
      setError(e.message || 'Error al procesar la medición. Verifica la conexión con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  const handleNueva = () => {
    setForm(EMPTY_FORM)
    setStep(0)
    setPersonaId(null)
    setResultado(null)
    setError(null)
  }

  const handleCorregirResultado = async () => {
    if (!resultado?.medicion_id) return
    setError(null)
    setLoading(true)
    try {
      await api.eliminarMedicion(resultado.medicion_id)
      setResultado(null)
      setStep(REVIEW_STEP)
    } catch (e) {
      console.error(e)
      setError(e.message || 'No se pudo anular la medición para corregir.')
    } finally {
      setLoading(false)
    }
  }

  const goNext = () => {
    setError(null)
    if (step === 0) {
      if (!form.nombre?.trim() || !form.dni?.trim()) {
        setError('Escribe el nombre y el DNI antes de continuar.')
        return
      }
    }
    setStep(s => Math.min(REVIEW_STEP, s + 1))
  }

  const goPrev = () => {
    setError(null)
    setStep(s => Math.max(0, s - 1))
  }

  const irAEditarDesdeResumen = () => {
    setError(null)
    setStep(0)
  }

  const isClienteStep = step === 0
  const isReviewStep = step === REVIEW_STEP
  const isMedidaStep = step >= 1 && step <= MEDIDAS.length
  const medidaIndex = step - 1
  const medidaActual = isMedidaStep ? MEDIDAS[medidaIndex] : null
  const pasoNumero = step + 1

  if (resultado) {
    return (
      <ResultadoTalla
        resultado={resultado}
        onNueva={handleNueva}
        onCorregir={handleCorregirResultado}
        corregirDisabled={loading}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 px-1 sm:px-0">
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">Nueva medición</h1>
        <p className="mt-2 text-base sm:text-lg text-slate-400">
          Un dato a la vez. En el último paso revisas todo antes de calcular.
        </p>
      </div>

      <p
        className="text-center font-display text-lg sm:text-xl font-semibold text-brand-300"
        aria-live="polite"
      >
        Paso {pasoNumero} de {TOTAL_STEPS}
      </p>

      <section className="card p-6 sm:p-8 shadow-lg">
        {isClienteStep && (
          <div className="space-y-6">
            <p className="font-display text-xl sm:text-2xl font-semibold text-white">Datos del cliente</p>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block font-display text-base sm:text-lg font-semibold uppercase tracking-wide text-slate-300">
                  Nombre completo
                </label>
                <input
                  className="input-field min-h-[3.25rem] text-lg sm:text-xl py-4"
                  placeholder="Ej. Juan Pérez"
                  value={form.nombre}
                  onChange={e => set('nombre', e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="mb-2 block font-display text-base sm:text-lg font-semibold uppercase tracking-wide text-slate-300">
                  DNI
                </label>
                <input
                  className="input-field min-h-[3.25rem] text-lg sm:text-xl py-4"
                  placeholder="Número de documento"
                  value={form.dni}
                  onChange={e => set('dni', e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        )}

        {isMedidaStep && medidaActual && (
          <div className="space-y-6 text-center">
            <p className="font-mono text-sm sm:text-base text-slate-500">
              Medida {medidaIndex + 1} de {MEDIDAS.length}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-white px-1">
              {medidaActual.label}
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-md mx-auto">{medidaActual.hint}</p>
            <div className="relative pt-2">
              <input
                className="input-field min-h-[4rem] pr-16 text-center text-2xl sm:text-3xl font-mono py-5"
                placeholder="0"
                value={form[medidaActual.key]}
                onChange={e => set(medidaActual.key, e.target.value)}
                inputMode="decimal"
                aria-label={`${medidaActual.label} en ${medidaActual.unit}`}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg sm:text-xl font-mono text-slate-500">
                {medidaActual.unit}
              </span>
            </div>
          </div>
        )}

        {isReviewStep && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="font-display text-xl sm:text-2xl font-semibold text-white">Revisión</p>
              <p className="mt-2 text-base sm:text-lg text-slate-400">
                Comprueba los datos. Puedes volver atrás con <strong className="text-slate-300">Anterior</strong> o
                empezar de nuevo el formulario.
              </p>
            </div>

            <dl className="space-y-4 text-left">
              <div className="border-b border-surface-border pb-3">
                <dt className="text-sm font-display font-semibold uppercase tracking-wide text-slate-500">Cliente</dt>
                <dd className="mt-1 text-xl text-white">{form.nombre || '—'}</dd>
                <dd className="font-mono text-lg text-slate-300">DNI {form.dni || '—'}</dd>
              </div>
              {MEDIDAS.map(m => (
                <div
                  key={m.key}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-surface-border/60 pb-3 last:border-0"
                >
                  <dt className="text-base sm:text-lg font-display font-semibold text-slate-300">{m.label}</dt>
                  <dd className="font-mono text-xl sm:text-2xl text-brand-200">
                    {form[m.key] || '—'} <span className="text-base text-slate-500">{m.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>

            <button
              type="button"
              className="btn-secondary w-full min-h-[3rem] text-lg"
              onClick={irAEditarDesdeResumen}
            >
              Volver a editar desde el inicio
            </button>
          </div>
        )}
      </section>

      {error && (
        <div
          className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-4 text-base text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          className="btn-secondary min-h-[3.25rem] text-lg"
          onClick={goPrev}
          disabled={step === 0}
        >
          ← Anterior
        </button>

        {!isReviewStep ? (
          <button type="button" className="btn-primary min-h-[3.25rem] text-lg" onClick={goNext}>
            Siguiente →
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary flex min-h-[3.25rem] items-center justify-center text-lg"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" aria-hidden>
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Calculando…
              </span>
            ) : (
              'Calcular tallas'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
