export default function ResultadoTalla({ resultado, onNueva, onCorregir, corregirDisabled }) {
  if (!resultado) return null
  const { saco, pantalon } = resultado

  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease]">
      <h2 className="font-display font-700 text-xl text-white">Tallas calculadas</h2>

      <div className="grid grid-cols-2 gap-3">
        <TallaCard
          prenda="SACO"
          talla={saco.talla}
          determinadaPor={saco.determinada_por}
          especial={saco.especial}
          detalles={saco.especiales_detalle}
        />
        <TallaCard
          prenda="PANTALÓN"
          talla={pantalon.talla}
          determinadaPor={pantalon.determinada_por}
          especial={pantalon.especial}
          detalles={pantalon.especiales_detalle}
        />
      </div>

      {(saco.especial || pantalon.especial) && (
        <div className="card p-4 border-red-800 bg-red-950/30 space-y-3">
          <p className="font-display font-600 text-red-400 text-sm uppercase tracking-widest">
            Detalle especial
          </p>
          {[
            ...(saco.especiales_detalle || []).map(d => ({ ...d, prenda: 'SACO' })),
            ...(pantalon.especiales_detalle || []).map(d => ({ ...d, prenda: 'PANTALÓN' })),
          ].map((d, i) => (
            <div key={i} className="text-sm space-y-0.5">
              <div className="flex gap-2 items-center">
                <span className="font-mono text-xs px-2 py-0.5 bg-red-900 text-red-300 rounded">{d.prenda}</span>
                <span className="text-slate-300">{d.codigo_medida_fuera}</span>
                {d.diferencia_cm !== null && (
                  <span className={`font-mono font-500 ${d.diferencia_cm < 0 ? 'text-orange-400' : 'text-yellow-400'}`}>
                    {d.diferencia_cm > 0 ? '+' : ''}{d.diferencia_cm} cm
                  </span>
                )}
              </div>
              {d.rango_esperado_min !== null && (
                <p className="text-xs text-slate-500 font-mono pl-1">
                  valor: {d.valor_real_cm} cm · rango esperado: {d.rango_esperado_min}–{d.rango_esperado_max} cm
                </p>
              )}
              <p className="text-xs text-slate-600 pl-1">{motivo(d.motivo)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 mt-2">
        {typeof onCorregir === 'function' && (
          <button
            type="button"
            onClick={onCorregir}
            disabled={corregirDisabled}
            className="btn-secondary w-full min-h-[3rem] text-lg disabled:opacity-50"
          >
            Corregir medidas
          </button>
        )}
        <button type="button" onClick={onNueva} className="btn-primary w-full min-h-[3rem] text-lg">
          Nueva medición
        </button>
      </div>
      <p className="text-center text-sm text-slate-500">
        «Corregir medidas» borra esta medición en el sistema y te devuelve al resumen para volver a calcular.
      </p>
    </div>
  )
}

function TallaCard({ prenda, talla, determinadaPor, especial, detalles }) {
  return (
    <div className={`card p-4 space-y-2 ${especial ? 'border-red-800' : 'border-brand-700'}`}>
      <p className="label">{prenda}</p>
      <div className={`talla-badge text-center text-2xl py-2 ${especial ? 'talla-especial' : 'talla-normal'}`}>
        {talla ?? '—'}
      </div>
      <p className="text-xs text-slate-500 text-center font-mono">
        por {determinadaPor ?? '—'}
        {especial && <span className="ml-1 text-red-400">· especial</span>}
      </p>
    </div>
  )
}

function motivo(m) {
  const map = {
    fuera_de_tabla: 'Fuera del rango de la tabla',
    fuera_de_rango: 'Fuera del rango de la talla asignada',
    diferencia_tallas: 'Diferencia grande entre medidas',
  }
  return map[m] ?? m
}
