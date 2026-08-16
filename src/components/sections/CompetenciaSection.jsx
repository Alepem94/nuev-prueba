import { useMemo } from 'react'
import { Users } from 'lucide-react'
import { SectionHeader, EmptyState } from '../ui/SectionHeader'
import { ChartCard, ComparisonBarChart } from '../ui/Charts'
import { PlatformInsightsCard, mergeLegacyObservations } from '../ui/EditorialInsights'
import { DataTable } from '../ui/DataTable'
import { safeNumber, formatNumber, truncTo, prevMonth } from '../../utils/format'

const ACCENT = '#a78bfa'
const RED_COLORS = {
  facebook: '#3b82f6',
  instagram: '#ec4899',
  tiktok: '#22d3ee',
}
const RED_LABELS = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok' }

export function CompetenciaSection({ data = [], allData = [], selectedMonth, observaciones = [], hallazgos = [], loading, theme }) {
  if (loading) {
    return <div className="rounded-2xl skeleton h-96" />
  }

  if (!data?.length) {
    return (
      <div className="space-y-6">
        <SectionHeader icon={Users} title="Competencia" subtitle="Sin datos para este mes" accentColor={ACCENT} />
        <EmptyState icon={Users} title="Sin análisis competitivo" message="No hay datos de competidores registrados para este mes." />
      </div>
    )
  }

  // Build previous month lookup: { "red|competidor" → seguidores }
  const pm = prevMonth(selectedMonth)
  const prevMap = useMemo(() => {
    const map = {}
    if (!pm) return map
    for (const r of allData) {
      if (r.mes !== pm) continue
      const key = `${(r.red || '').toLowerCase()}|${(r.competidor || '').toLowerCase()}`
      map[key] = safeNumber(r.seguidores)
    }
    return map
  }, [allData, pm])

  const redes = [...new Set(data.map(d => d.red).filter(Boolean))]

  const generalInsights = useMemo(() => mergeLegacyObservations(
    (hallazgos || []).filter(h => String(h.seccion || '').toLowerCase() === 'competencia'),
    (observaciones || []).filter(o => String(o.seccion || '').toLowerCase() === 'competencia')
  ), [hallazgos, observaciones])

  return (
    <div className="space-y-6">
      <SectionHeader icon={Users} title="Competencia" subtitle="Análisis del entorno competitivo" accentColor={ACCENT} />

      {generalInsights.length > 0 && (
        <PlatformInsightsCard items={generalInsights} accent={ACCENT} label="Cómo estuvo la competencia" />
      )}

      {redes.map((red, idx) => {
        const subset = data.filter(d => d.red === red)
        const chartData = subset.map(s => ({
          name: s.competidor,
          Seguidores: safeNumber(s.seguidores),
        }))
        const redKey = String(red || '').toLowerCase()
        const redInsights = mergeLegacyObservations(
          (hallazgos || []).filter(h => String(h.seccion || '').toLowerCase() === `competencia-${redKey}`),
          (observaciones || []).filter(o => String(o.seccion || '').toLowerCase() === `competencia-${redKey}`)
        )

        return (
          <div key={red} className="space-y-3">
            {redInsights.length > 0 && (
              <PlatformInsightsCard items={redInsights} accent={RED_COLORS[redKey] || ACCENT} label={`Observaciones · ${RED_LABELS[redKey] || red}`} />
            )}
            <ChartCard
              title={`Competencia en ${red.charAt(0).toUpperCase() + red.slice(1)}`}
              subtitle={`${subset.length} competidores monitoreados`}
              delay={idx}
            >
              {({ scale, expanded }) => (
                <div className="space-y-5">
                  <ComparisonBarChart
                    data={chartData}
                    scale={scale}
                    expanded={expanded}
                    bars={[{ key: 'Seguidores', name: 'Seguidores', color: RED_COLORS[red] || ACCENT }]}
                  />
                  <DataTable
                    columns={[
                      { key: 'competidor', label: 'Competidor', bold: true },
                      { key: 'seguidores', label: 'Seguidores', align: 'right', render: v => formatNumber(v) },
                      {
                        key: '_variacion', label: 'Var. vs Ant.', align: 'right',
                        render: (_, r) => {
                          const current = safeNumber(r.seguidores)
                          const prevKey = `${(r.red || '').toLowerCase()}|${(r.competidor || '').toLowerCase()}`
                          const prev = prevMap[prevKey]
                          if (!prev || prev === 0 || !current) return <span className="text-white/30">—</span>
                          const pct = ((current - prev) / prev) * 100
                          return (
                            <span className={pct >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                              {pct >= 0 ? '+' : ''}{truncTo(pct, 2)}%
                            </span>
                          )
                        }
                      },
                      { key: 'posts', label: 'Posts', align: 'right', render: v => formatNumber(v) },
                      {
                        key: 'engagement_pct', label: 'Engagement', align: 'right',
                        render: v => {
                          const num = parseFloat(v)
                          if (isNaN(num)) return '-'
                          return `${truncTo(num * 100, 2)}%`
                        }
                      },
                    ]}
                    data={subset}
                  />
                </div>
              )}
            </ChartCard>
          </div>
        )
      })}
    </div>
  )
}
