import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function GestionPersonas() {
  const [q, setQ] = useState('')
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [borrandoId, setBorrandoId] = useState(null)

  const cargar = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const rows = await api.buscarPersonas(q.trim())
      setLista(rows || [])
    } catch (e) {
      console.error(e)
      setError(e.message || 'No se pudo cargar la lista.')
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    const t = setTimeout(() => {
      cargar()
    }, 300)
    return () => clearTimeout(t)
  }, [cargar])

  const eliminar = async row => {
    const ok = window.confirm(
      `¿Eliminar a ${row.nombre} (DNI ${row.dni})?\n\nSe borrarán también todas sus mediciones. Esta acción no se puede deshacer.`,
    )
    if (!ok) return
    setBorrandoId(row.id)
    setError(null)
    try {
      await api.eliminarPersona(row.id)
      setLista(prev => prev.filter(p => p.id !== row.id))
    } catch (e) {
      console.error(e)
      setError(e.message || 'No se pudo eliminar.')
    } finally {
      setBorrandoId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-5">
      <Link
        to="/nueva"
        replace
        className="inline-block font-display text-base text-brand-400 hover:text-brand-300"
      >
        ← Volver a Medir
      </Link>
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">Personas</h1>
        <p className="mt-2 text-base sm:text-lg text-slate-400">
          Busca y elimina registros de prueba o datos que ya no necesites. Al borrar una persona se
          eliminan sus mediciones y dejan de salir en el reporte.
        </p>
      </div>

      <div>
        <label className="label">Buscar por nombre o DNI</label>
        <input
          className="input-field min-h-[3rem] text-lg"
          placeholder="Dejar vacío para ver las últimas 50"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-base text-red-200" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-center text-lg text-slate-400">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="text-center text-lg text-slate-500">No hay personas que coincidan.</p>
      ) : (
        <ul className="space-y-3">
          {lista.map(p => (
            <li key={p.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="truncate font-display text-lg font-semibold text-white">{p.nombre}</p>
                <p className="font-mono text-base text-slate-400">DNI {p.dni}</p>
                {p.created_at && (
                  <p className="text-sm text-slate-500">
                    Registro: {new Date(p.created_at).toLocaleString()}
                  </p>
                )}
                <Link
                  to={`/persona/${p.id}`}
                  className="inline-block text-sm font-display text-brand-400 hover:text-brand-300"
                >
                  Ver historial de mediciones →
                </Link>
              </div>
              <button
                type="button"
                className="btn-secondary shrink-0 text-base min-h-[3rem] px-5 disabled:opacity-50"
                onClick={() => eliminar(p)}
                disabled={borrandoId === p.id}
              >
                {borrandoId === p.id ? 'Eliminando…' : 'Eliminar'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
