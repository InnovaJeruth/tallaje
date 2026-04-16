import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Reporte() {
  const [data, setData] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('SACO')

  useEffect(() => {
    Promise.all([api.reporteTallas(), api.resumen()])
      .then(([d, r]) => { setData(d); setResumen(r) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-slate-400 text-sm">Cargando reporte…</p>
  if (error) return <p className="text-red-400 text-sm">{error}</p>
  if (!data) return null

  const prenda = data[tab]

  const totalEspeciales = (prenda.grupos_especiales ?? []).reduce((sum, g) =>
    sum + g.grupos.reduce((s2, gr) => s2 + gr.cantidad, 0), 0
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-800 text-2xl text-white">Reporte de tallas</h1>
        <p className="text-sm text-slate-400 mt-1">Agrupación global por prenda</p>
      </div>

      {/* Resumen cards */}
      {resumen && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Personas', value: resumen.total_personas },
            { label: 'Mediciones', value: resumen.total_mediciones },
            { label: 'Especiales', value: resumen.total_especiales, red: true },
          ].map(c => (
            <div key={c.label} className="card p-4 text-center">
              <p className={`font-mono font-500 text-2xl ${c.red ? 'text-red-400' : 'text-brand-400'}`}>
                {c.value}
              </p>
              <p className="text-xs text-slate-500 font-display mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {['SACO', 'PANTALON'].map(p => (
          <button
            key={p}
            onClick={() => setTab(p)}
            className={`px-4 py-2 rounded-xl font-display font-600 text-sm transition-all ` +
              (tab === p
                ? 'bg-brand-600 text-white'
                : 'bg-surface-card text-slate-400 hover:text-slate-200 border border-surface-border')}
          >
            {p === 'PANTALON' ? 'PANTALÓN' : p}
          </button>
        ))}
      </div>

      {/* Tallas normales */}
      <section className="space-y-3">
        <p className="font-display font-600 text-brand-400 text-xs uppercase tracking-widest">
          Tallas normales — {prenda.tallas.reduce((s, t) => s + t.cantidad, 0)} personas
        </p>

        {prenda.tallas.length === 0 ? (
          <p className="text-slate-500 text-sm">Sin datos aún</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(
              prenda.tallas.reduce((acc, t) => {
                const key = t.etiqueta || t.talla
                if (!acc[key]) acc[key] = []
                acc[key].push(t)
                return acc
              }, {})
            ).map(([etiqueta, tallas]) => (
              <div key={etiqueta} className="card overflow-hidden">
                <div className="px-4 py-2 border-b border-surface-border bg-white/[0.03] flex items-center gap-2">
                  <span className="font-display font-700 text-brand-400 text-sm">{etiqueta}</span>
                  <span className="text-xs text-slate-500">
                    {tallas.reduce((s, t) => s + t.cantidad, 0)} personas
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-left">
                      <th className="px-4 py-2 font-display font-600 text-slate-400 text-xs uppercase">Talla</th>
                      <th className="px-4 py-2 font-display font-600 text-slate-400 text-xs uppercase">Personas</th>
                      <th className="px-4 py-2 font-display font-600 text-slate-400 text-xs uppercase">
                        {tab === 'SACO' ? 'L. manga std' : 'L. pantalón std'}
                      </th>
                      <th className="px-4 py-2 font-display font-600 text-slate-400 text-xs uppercase">Sub-grupos largo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tallas.map((t, i) => (
                      <tr key={t.talla} className={`border-b border-surface-border/50 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                        <td className="px-4 py-2">
                          <span className="talla-badge talla-normal">{t.talla}</span>
                        </td>
                        <td className="px-4 py-2 font-mono text-slate-200">{t.cantidad}</td>
                        <td className="px-4 py-2 font-mono text-slate-400">
                          {t.largo_std != null ? `${t.largo_std} cm` : '—'}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {t.grupos_largo.map((g, j) => (
                              <span key={j} className="font-mono text-xs bg-surface px-2 py-0.5 rounded text-slate-300">
                                {g.centro} cm <span className="text-slate-500">×{g.cantidad}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Especiales agrupados */}
      <section className="space-y-3">
        <p className="font-display font-600 text-red-400 text-xs uppercase tracking-widest">
          Especiales — {totalEspeciales} personas
        </p>

        {(prenda.grupos_especiales ?? []).length === 0 ? (
          <p className="text-slate-500 text-sm">Sin especiales</p>
        ) : (
          <div className="space-y-4">
            {prenda.grupos_especiales.map((ge) => (
              <div key={ge.talla_asignada} className="card overflow-hidden">

                {/* Cabecera talla asignada */}
                <div className="px-4 py-2 border-b border-surface-border bg-white/[0.03] flex items-center gap-3">
                  <span className="talla-badge talla-especial">{ge.talla_asignada ?? 'Sin talla'}</span>
                  <span className="text-xs text-slate-400 font-display">
                    {ge.grupos.reduce((s, g) => s + g.cantidad, 0)} personas especiales en esta talla
                  </span>
                </div>

                {/* Grupos por medida + diferencia */}
                {ge.grupos.map((gr, gi) => (
                  <div key={gi} className={gi > 0 ? 'border-t border-surface-border/40' : ''}>

                    {/* Sub-cabecera del grupo */}
                    <div className="px-4 py-2 bg-white/[0.02] flex items-center gap-3">
                      <span className="font-mono text-xs text-slate-400 uppercase">{gr.medida_fuera}</span>
                      {gr.diferencia_centro != null ? (
                        <span className={`font-mono font-600 text-sm ${gr.diferencia_centro < 0 ? 'text-orange-400' : 'text-yellow-400'}`}>
                          {gr.diferencia_centro > 0 ? '+' : ''}{gr.diferencia_centro} cm
                        </span>
                      ) : (
                        <span className="text-red-500 text-xs font-display">fuera de tabla</span>
                      )}
                      <span className="text-slate-600 text-xs ml-auto">×{gr.cantidad}</span>
                    </div>

                    {/* Personas del grupo */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-border/30 text-left">
                          <th className="px-4 py-2 font-display font-600 text-slate-500 text-xs uppercase">Persona</th>
                          <th className="px-4 py-2 font-display font-600 text-slate-500 text-xs uppercase">
                            {gr.diferencia_centro != null ? 'Dif. prenda' : 'Medida corporal'}
                          </th>
                          <th className="px-4 py-2 font-display font-600 text-slate-500 text-xs uppercase">Largo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gr.personas.map((p, pi) => (
                          <tr
                            key={pi}
                            className={`border-b border-surface-border/30 ${pi % 2 === 0 ? '' : 'bg-white/[0.02]'}`}
                          >
                            <td className="px-4 py-2">
                              <p className="text-slate-200">{p.nombre}</p>
                              <p className="text-xs text-slate-500 font-mono">{p.dni}</p>
                            </td>
                            <td className="px-4 py-2">
                              {p.diferencia_cm != null ? (
                                // Grupo normal: diferencia de prenda
                                <span className={`font-mono font-500 text-sm ${p.diferencia_cm < 0 ? 'text-orange-400' : 'text-yellow-400'}`}>
                                  {p.diferencia_cm > 0 ? '+' : ''}{p.diferencia_cm} cm
                                </span>
                              ) : p.valor_corporal != null ? (
                                // Fuera de tabla: mostramos medida corporal como referencia
                                <span className="font-mono text-sm text-slate-300">
                                  {p.valor_corporal} cm
                                  <span className="text-slate-500 text-xs ml-1">(corp.) - sin talla</span>
                                </span>
                              ) : (
                                <span className="text-slate-500 text-xs">sin datos</span>
                              )}
                            </td>
                            <td className="px-4 py-2 font-mono text-slate-400 text-sm">
                              {p.largo != null ? `${p.largo} cm` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}