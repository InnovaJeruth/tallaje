import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Configuracion() {
  const [config, setConfig]   = useState([])
  const [saving, setSaving]   = useState({})
  const [saved, setSaved]     = useState({})
  const [error, setError]     = useState(null)

  const [rangos, setRangos]       = useState([])
  const [tabPrenda, setTabPrenda] = useState('SACO')
  const [editando, setEditando]   = useState({})   // { [rango_id]: { min, max, std } }
  const [savingR, setSavingR]     = useState({})

  useEffect(() => {
    api.listarConfig().then(setConfig).catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    api.listarRangos(tabPrenda).then(setRangos).catch(e => setError(e.message))
  }, [tabPrenda])

  const saveConfig = async (clave, valor) => {
    setSaving(s => ({ ...s, [clave]: true }))
    try {
      const updated = await api.actualizarConfig(clave, valor)
      setConfig(c => c.map(x => x.clave === clave ? updated : x))
      setSaved(s => ({ ...s, [clave]: true }))
      setTimeout(() => setSaved(s => ({ ...s, [clave]: false })), 2000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(s => ({ ...s, [clave]: false }))
    }
  }

  const saveRango = async (id) => {
    const d = editando[id]
    if (!d) return
    setSavingR(s => ({ ...s, [id]: true }))
    try {
      await api.actualizarRango(id, {
        rango_min: parseFloat(d.min),
        rango_max: parseFloat(d.max),
        valor_std: d.std ? parseFloat(d.std) : null,
      })
      setEditando(e => { const n = { ...e }; delete n[id]; return n })
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingR(s => ({ ...s, [id]: false }))
    }
  }

  // Agrupar rangos por talla
  const porTalla = {}
  for (const r of rangos) {
    if (!porTalla[r.talla]) porTalla[r.talla] = { orden: r.orden_num, medidas: [] }
    porTalla[r.talla].medidas.push(r)
  }
  const tallasOrdenadas = Object.entries(porTalla).sort((a, b) => a[1].orden - b[1].orden)

  const claveLabel = {
    umbral_especial_tallas: 'Umbral especial (N.° tallas)',
    tolerancia_largo_cm:    'Tolerancia largo (cm)',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-800 text-2xl text-white">Configuración</h1>
        <p className="text-sm text-slate-400 mt-1">Parámetros del sistema y rangos de tallaje</p>
      </div>

      {error && (
        <div className="bg-red-950/50 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Parámetros globales */}
      <section className="card p-5 space-y-4">
        <p className="font-display font-600 text-brand-400 text-xs uppercase tracking-widest">
          Parámetros globales
        </p>
        {config.map(c => (
          <div key={c.clave} className="space-y-1">
            <label className="label">{claveLabel[c.clave] ?? c.clave}</label>
            <p className="text-xs text-slate-500 mb-2">{c.descripcion}</p>
            <div className="flex gap-2">
              <input
                className="input-field max-w-[120px]"
                defaultValue={c.valor}
                onBlur={e => {
                  if (e.target.value !== c.valor) saveConfig(c.clave, e.target.value)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveConfig(c.clave, e.target.value)
                }}
              />
              {saved[c.clave] && (
                <span className="self-center text-xs text-emerald-400 font-mono">✓ guardado</span>
              )}
              {saving[c.clave] && (
                <span className="self-center text-xs text-slate-400 font-mono">guardando…</span>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Rangos de tallaje */}
      <section className="space-y-3">
        <p className="font-display font-600 text-brand-400 text-xs uppercase tracking-widest">
          Rangos de tallaje
        </p>
        <p className="text-xs text-slate-500">
          Edita los rangos corporales por talla. Los cambios afectan solo a nuevas mediciones.
        </p>

        {/* Tabs prenda */}
        <div className="flex gap-2">
          {['SACO', 'PANTALON'].map(p => (
            <button
              key={p}
              onClick={() => setTabPrenda(p)}
              className={`px-4 py-2 rounded-xl font-display font-600 text-sm transition-all ` +
                (tabPrenda === p
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-card text-slate-400 hover:text-slate-200 border border-surface-border')}
            >
              {p === 'PANTALON' ? 'PANTALÓN' : p}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {tallasOrdenadas.map(([talla, { medidas }]) => (
            <div key={talla} className="card p-4 space-y-3">
              <p className="font-display font-700 text-sm">
                <span className="talla-badge talla-normal">{talla}</span>
              </p>
              <div className="space-y-2">
                {medidas.map(r => {
                  const ed = editando[r.id]
                  return (
                    <div key={r.id} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                      <div>
                        <p className="text-xs text-slate-400 font-mono mb-1">{r.codigo_medida}</p>
                        {ed ? (
                          <div className="flex gap-2 items-center">
                            <input
                              className="input-field py-1.5 text-xs max-w-[80px]"
                              value={ed.min}
                              onChange={e => setEditando(x => ({ ...x, [r.id]: { ...x[r.id], min: e.target.value } }))}
                              placeholder="min"
                            />
                            <span className="text-slate-500 text-xs">–</span>
                            <input
                              className="input-field py-1.5 text-xs max-w-[80px]"
                              value={ed.max}
                              onChange={e => setEditando(x => ({ ...x, [r.id]: { ...x[r.id], max: e.target.value } }))}
                              placeholder="max"
                            />
                            {r.valor_std != null && (
                              <>
                                <span className="text-slate-500 text-xs ml-1">std</span>
                                <input
                                  className="input-field py-1.5 text-xs max-w-[70px]"
                                  value={ed.std ?? ''}
                                  onChange={e => setEditando(x => ({ ...x, [r.id]: { ...x[r.id], std: e.target.value } }))}
                                  placeholder="std"
                                />
                              </>
                            )}
                          </div>
                        ) : (
                          <p className="font-mono text-sm text-slate-300">
                            {r.rango_min} – {r.rango_max} cm
                            {r.valor_std != null && (
                              <span className="text-slate-500 ml-2">std {r.valor_std}</span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {ed ? (
                          <>
                            <button
                              className="btn-primary py-1.5 px-3 text-xs"
                              onClick={() => saveRango(r.id)}
                              disabled={savingR[r.id]}
                            >
                              {savingR[r.id] ? '…' : 'OK'}
                            </button>
                            <button
                              className="btn-secondary py-1.5 px-2 text-xs"
                              onClick={() => setEditando(e => { const n = { ...e }; delete n[r.id]; return n })}
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn-secondary py-1.5 px-3 text-xs"
                            onClick={() => setEditando(e => ({
                              ...e,
                              [r.id]: { min: r.rango_min, max: r.rango_max, std: r.valor_std }
                            }))}
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
