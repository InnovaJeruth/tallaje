import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

/** Orden y etiquetas para medidas corporales (coincide con detalle en BD) */
const MEDIDAS_ORDEN = [
  { codigo: 'PECHO', label: 'Pecho', unit: 'cm' },
  { codigo: 'CINTURA', label: 'Cintura', unit: 'cm' },
  { codigo: 'CADERA', label: 'Cadera', unit: 'cm' },
  { codigo: 'LARGO_MANGA', label: 'Largo de manga', unit: 'cm' },
  { codigo: 'LARGO', label: 'Largo de pantalón', unit: 'cm' },
]

export default function HistorialPersona() {
  const { id } = useParams()
  const [persona, setPersona] = useState(null)
  const [mediciones, setMediciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([api.obtenerPersona(id), api.medicionesDePersona(id)])
      .then(([p, m]) => {
        setPersona(p)
        setMediciones(m)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-slate-400 text-base">Cargando…</p>
  if (error) return <p className="text-red-400 text-base">{error}</p>

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/personas"
            className="inline-block font-display text-base text-brand-400 hover:text-brand-300"
          >
            ← Volver a la lista
          </Link>
          <h1 className="font-display font-extrabold mt-2 text-2xl text-white">{persona?.nombre}</h1>
          <p className="font-mono text-base text-slate-400">DNI {persona?.dni}</p>
        </div>
      </div>

      <div>
        <h2 className="font-display font-semibold text-lg text-brand-300 uppercase tracking-wide">
          Historial de mediciones
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Medidas tomadas y tallas calculadas por fecha.
        </p>
      </div>

      <div className="space-y-4">
        {mediciones.length === 0 ? (
          <p className="text-slate-500 text-base">Sin mediciones registradas</p>
        ) : (
          mediciones.map(m => (
            <div key={m.id} className="card space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-mono text-sm text-slate-500">
                  {m.fecha ? new Date(m.fecha).toLocaleString('es-PE') : '—'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {m.talla_saco != null && m.talla_saco !== '' && (
                    <span
                      className={`talla-badge text-base ${m.saco_especial ? 'talla-especial' : 'talla-normal'}`}
                    >
                      SACO {m.talla_saco}
                    </span>
                  )}
                  {m.talla_pantalon != null && m.talla_pantalon !== '' && (
                    <span
                      className={`talla-badge text-base ${m.pantalon_especial ? 'talla-especial' : 'talla-normal'}`}
                    >
                      PANT {m.talla_pantalon}
                    </span>
                  )}
                </div>
              </div>

              {m.medidas && Object.keys(m.medidas).length > 0 && (
                <div className="border-t border-surface-border pt-4">
                  <p className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Medidas tomadas (cm)
                  </p>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {MEDIDAS_ORDEN.map(({ codigo, label, unit }) => {
                      const v = m.medidas[codigo]
                      if (v == null && v !== 0) return null
                      return (
                        <div
                          key={codigo}
                          className="flex items-baseline justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-2"
                        >
                          <dt className="text-base text-slate-300">{label}</dt>
                          <dd className="font-mono text-lg font-medium text-white">
                            {v} {unit}
                          </dd>
                        </div>
                      )
                    })}
                  </dl>
                </div>
              )}

              {m.observaciones && (
                <p className="border-t border-surface-border pt-3 text-sm italic text-slate-400">
                  {m.observaciones}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
