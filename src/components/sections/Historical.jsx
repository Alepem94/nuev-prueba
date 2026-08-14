import { useMemo, useState } from 'react'
import {
  Activity, ArrowLeft, BarChart3, ChevronLeft, ChevronRight, Eye, Heart, LineChart, Target, Users,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChartCard, MultiMetricLineChart } from '../ui/Charts'
import { SectionHeader } from '../ui/SectionHeader'
import { safeNumber, formatMonthShort, formatNumber } from '../../utils/format'
import {
  buildPlatformHistory,
  buildPaidMediaHistory,
  buildAccountHistory,
  getMetricHighlights,
  getSocialMetricConfig,
} from '../../utils/historicalAnalytics'

const ICONS = { users: Users, eye: Eye, heart: Heart, activity: Activity }

function ScaleToggle({ scale, onChange }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 p-1">
      <button
        onClick={() => onChange('linear')}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${scale === 'linear' ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white'}`}
      >Lineal</button>
      <button
        onClick={() => onChange('log')}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${scale === 'log' ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white'}`}
      >Logarítmica</button>
    </div>
  )
}

function MetricSelector({ metrics, selected, onToggle, accent }) {
  return (
    <div className="flex flex-wrap gap-2">
      {metrics.map(metric => {
        const active = selected.includes(metric.key)
        return (
          <button
            key={metric.key}
            onClick={() => onToggle(metric.key)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${active ? 'text-white' : 'text-white/45 hover:text-white'}`}
            style={active ? { background: `${metric.color}18`, borderColor: `${metric.color}66`, boxShadow: `0 4px 18px -8px ${metric.color}66` } : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
          >
            <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: active ? metric.color : 'rgba(255,255,255,0.25)' }} />
            {metric.label}
          </button>
        )
      })}
      <button
        onClick={() => selected.length === metrics.length ? onToggle('__clear__') : onToggle('__all__')}
        className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white/55 hover:text-white transition"
      >
        {selected.length === metrics.length ? 'Quitar todos' : 'Ver todos'}
      </button>
    </div>
  )
}

function HighlightStrip({ rows, selectedMetric, currentMonth, metricConfig }) {
  const metric = metricConfig.find(m => m.key === selectedMetric)
  const highlight = getMetricHighlights(rows, selectedMetric, currentMonth)
  if (!metric || !highlight) return null
  const Icon = ICONS[metric.icon] || Activity
  const comparison = highlight.vsAverage == null
    ? 'No hay suficiente histórico para comparar.'
    : `${highlight.vsAverage >= 0 ? '+' : ''}${highlight.vsAverage.toFixed(1)}% vs. el promedio de los meses anteriores visibles.`
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 font-semibold">
          <Icon className="w-3.5 h-3.5" style={{ color: metric.color }} /> Mejor mes
        </div>
        <p className="text-lg font-bold text-white mt-2">{formatMonthShort(highlight.bestMonth) || '—'}</p>
        <p className="text-xs text-white/45 mt-1">{formatHistoricalMetric(highlight.bestValue, metric.format)}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Mes actual</div>
        <p className="text-lg font-bold text-white mt-2">{formatMonthShort(highlight.currentMonth) || '—'}</p>
        <p className="text-xs text-white/45 mt-1">{formatHistoricalMetric(highlight.currentValue, metric.format)}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Comportamiento</div>
        <p className={`text-lg font-bold mt-2 ${highlight.vsAverage == null ? 'text-white/70' : highlight.vsAverage >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
          {highlight.vsAverage == null ? '—' : `${highlight.vsAverage >= 0 ? '+' : ''}${highlight.vsAverage.toFixed(1)}%`}
        </p>
        <p className="text-xs text-white/45 mt-1">{comparison} · {highlight.rank}° de {highlight.totalMonths} meses.</p>
      </div>
    </div>
  )
}

function formatHistoricalMetric(value, format) {
  const n = safeNumber(value)
  if (format === 'percent') return `${n.toFixed(2)}%`
  return formatNumber(n)
}

function FanpageHistory({ rows, platform, currentMonth, accent }) {
  const metrics = getSocialMetricConfig(platform)
  const [selected, setSelected] = useState([metrics[0].key])
  const [scale, setScale] = useState('linear')

  const chartLines = metrics.filter(m => selected.includes(m.key)).map(m => ({
    key: m.key,
    name: m.label,
    color: m.color,
    format: m.format,
  }))
  const chartData = rows.map(row => ({ mes: row.mes, ...Object.fromEntries(selected.map(key => [key, safeNumber(row[key])])) }))

  const toggle = key => {
    if (key === '__all__') return setSelected(metrics.map(m => m.key))
    if (key === '__clear__') return setSelected([metrics[0].key])
    setSelected(prev => prev.includes(key) ? (prev.length === 1 ? prev : prev.filter(k => k !== key)) : [...prev, key])
  }

  const primary = metrics.find(m => m.key === selected[0]) || metrics[0]
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-white">Rendimiento de fanpage</h2>
          <p className="text-xs text-white/45 mt-1">Selecciona uno, dos o todos los KPIs. Cada métrica conserva su propia escala.</p>
        </div>
        <ScaleToggle scale={scale} onChange={setScale} />
      </div>
      <MetricSelector metrics={metrics} selected={selected} onToggle={toggle} accent={accent} />
      <ChartCard title={`${primary.label}${selected.length > 1 ? ' y otros KPIs' : ''}`} subtitle="Histórico mensual · etiquetas siempre visibles" allowLogScale={false} expandable>
        {({ expanded }) => (
          <MultiMetricLineChart data={chartData} lines={chartLines} scale={scale} expanded={expanded} percentKeys={metrics.filter(m => m.format === 'percent').map(m => m.key)} />
        )}
      </ChartCard>
      <HighlightStrip rows={rows} selectedMetric={selected[0]} currentMonth={currentMonth} metricConfig={metrics} />
    </section>
  )
}

const VIEW_CONFIG = {
  result: { label: 'Resultados', accent: '#22d3ee' },
  spend: { label: 'Inversión', accent: '#f59e0b' },
  cpr: { label: 'Costo por resultado', accent: '#34d399' },
}

const SCOPE_CONFIG = {
  isolated: { label: 'Aislado', icon: Target },
  compare: { label: 'Comparar', icon: BarChart3 },
  combined: { label: 'Todos combinados', icon: LineChart },
  average: { label: 'Promedio', icon: Activity },
}

function FilterPills({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).map(([key, cfg]) => {
        const Icon = cfg.icon
        const active = value === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${active ? 'text-white' : 'text-white/45 hover:text-white'}`}
            style={active
              ? { background: `${cfg.accent || '#facc15'}18`, borderColor: `${cfg.accent || '#facc15'}66` }
              : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {cfg.label}
          </button>
        )
      })}
    </div>
  )
}

function ObjectiveChips({ metrics, selected, multi, onToggle, onPick }) {
  return (
    <div className="flex flex-wrap gap-2">
      {metrics.map(metric => {
        const active = selected.includes(metric.key)
        return (
          <button
            key={metric.key}
            onClick={() => multi ? onToggle(metric.key) : onPick(metric.key)}
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${active ? 'text-white' : 'text-white/45 hover:text-white'}`}
            style={active ? { background: `${metric.color}18`, borderColor: `${metric.color}66` } : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2" style={{ background: active ? metric.color : 'rgba(255,255,255,0.25)' }} />
            {metric.label}
          </button>
        )
      })}
    </div>
  )
}

function PaidMediaHistory({ campanas, platform, currentMonth, accent }) {
  const paid = useMemo(() => buildPaidMediaHistory(campanas, platform, 12, currentMonth), [campanas, platform, currentMonth])
  const metrics = paid.metrics

  const [view, setView] = useState('result')
  const [scope, setScope] = useState('isolated')
  const [selected, setSelected] = useState(() => metrics.slice(0, 1).map(m => m.key))
  const [scale, setScale] = useState('linear')

  const changeScope = nextScope => {
    setScope(nextScope)
    if (nextScope === 'isolated') setSelected(metrics.slice(0, 1).map(m => m.key))
    else if (nextScope === 'compare') setSelected(metrics.slice(0, Math.min(2, metrics.length)).map(m => m.key))
    else if (nextScope === 'average') setSelected(metrics.map(m => m.key))
  }

  const pickObjective = key => setSelected([key])
  const toggleObjective = key => setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  // Series enriquecida: cpr_total (para "Todos combinados" en vista Costo por resultado)
  // y el promedio simple de las métricas seleccionadas (para "Promedio").
  const chartData = useMemo(() => paid.series.map(row => {
    const cpr_total = row.spend_total > 0 && row.result_total > 0 ? row.spend_total / row.result_total : null
    let avgField = null
    if (scope === 'average' && selected.length) {
      const vals = selected.map(k => row[`${view}_${k}`]).filter(v => v !== null && v !== undefined)
      avgField = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    }
    return { ...row, cpr_total, [`${view}_avg`]: avgField }
  }), [paid.series, scope, view, selected])

  const lines = useMemo(() => {
    const fmt = view === 'result' ? undefined : 'currency'
    if (scope === 'isolated') {
      const m = metrics.find(m => m.key === selected[0])
      return m ? [{ key: `${view}_${m.key}`, name: m.label, color: m.color, format: fmt }] : []
    }
    if (scope === 'compare') {
      return metrics.filter(m => selected.includes(m.key)).map(m => ({ key: `${view}_${m.key}`, name: m.label, color: m.color, format: fmt }))
    }
    if (scope === 'combined') {
      return [{ key: `${view}_total`, name: 'Total combinado', color: accent, format: fmt }]
    }
    // average
    return [{ key: `${view}_avg`, name: 'Promedio', color: accent, format: fmt }]
  }, [scope, view, selected, metrics, accent])

  const title = `${VIEW_CONFIG[view].label} · ${SCOPE_CONFIG[scope].label}`
  const subtitle = scope === 'isolated'
    ? `Métrica única, sin mezclar con otros objetivos`
    : scope === 'compare'
      ? `Comparando ${selected.length} objetivo${selected.length === 1 ? '' : 's'} lado a lado`
      : scope === 'combined'
        ? `Suma de todos los objetivos activos cada mes`
        : `Promedio simple entre los objetivos seleccionados`

  return (
    <section className="space-y-4 pt-2">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-white">Rendimiento de Paid Media</h2>
          <p className="text-xs text-white/45 mt-1">Elige qué métrica ver y con qué alcance — la gráfica se arma sola con esa combinación.</p>
        </div>
        <ScaleToggle scale={scale} onChange={setScale} />
      </div>

      {metrics.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-white/40 text-sm">No hay campañas históricas para esta plataforma.</div>
      ) : (
        <>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-2">Qué métrica</p>
            <FilterPills options={VIEW_CONFIG} value={view} onChange={setView} />
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-2">Con qué alcance</p>
            <FilterPills options={SCOPE_CONFIG} value={scope} onChange={changeScope} />
          </div>

          {(scope === 'isolated' || scope === 'compare' || scope === 'average') && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-2">
                {scope === 'isolated' ? 'Objetivo' : 'Objetivos incluidos'}
              </p>
              <ObjectiveChips
                metrics={metrics}
                selected={selected}
                multi={scope !== 'isolated'}
                onToggle={toggleObjective}
                onPick={pickObjective}
              />
            </div>
          )}

          <ChartCard title={title} subtitle={`${subtitle} · meses sin actividad quedan como ausencia, no como cero`} allowLogScale={false}>
            {({ expanded }) => (
              <MultiMetricLineChart data={chartData} lines={lines} scale={scale} expanded={expanded} connectNulls percentKeys={[]} />
            )}
          </ChartCard>

          <PaidMediaLegendNote view={view} />
        </>
      )}
    </section>
  )
}

function PaidMediaLegendNote({ view }) {
  const text = view === 'result'
    ? 'Resultados: suma de la columna Resultado de Campañas por mes.'
    : view === 'spend'
      ? 'Inversión: suma del gasto registrado en Campañas por mes.'
      : 'Costo por resultado: CPM para alcance y costo por resultado para los demás objetivos.'
  return <p className="text-[11px] text-white/35">{text} Las etiquetas solo aparecen cuando existe un dato real.</p>
}


export function AccountHistoricalCarousel({ historical, selectedMonth, theme }) {
  const [index, setIndex] = useState(0)
  const [scale, setScale] = useState('linear')
  const metrics = [
    { key: 'seguidores', label: 'Seguidores', color: theme?.primary || '#60a5fa', format: 'number', icon: Users },
    { key: 'alcance', label: 'Alcance', color: '#22d3ee', format: 'number', icon: Eye },
    { key: 'interacciones', label: 'Interacciones', color: '#ec4899', format: 'number', icon: Heart },
    { key: 'engagement_rate', label: 'Engagement Rate', color: '#22c55e', format: 'percent', icon: Activity },
  ]
  const rows = useMemo(() => {
    return buildAccountHistory({ facebook: historical?.facebook || [], instagram: historical?.instagram || [], tiktok: historical?.tiktok || [] }, 12, selectedMonth)
  }, [historical, selectedMonth])
  const metric = metrics[index]
  const Icon = metric.icon
  const chartData = rows.map(r => ({ mes: r.mes, [metric.key]: safeNumber(r[metric.key]) }))
  const highlight = getMetricHighlights(rows, metric.key, selectedMonth)
  return (
    <ChartCard title="Histórico de performance de la cuenta" subtitle="Un KPI a la vez · acumulado de Facebook + Instagram + TikTok" allowLogScale={false}>
      {({ expanded }) => (
        <div>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setIndex((index - 1 + metrics.length) % metrics.length)} className="p-2 rounded-xl border border-white/10 bg-white/5 text-white/50 hover:text-white" title="KPI anterior"><ChevronLeft className="w-4 h-4" /></button>
              {metrics.map((m, i) => (
                <button key={m.key} onClick={() => setIndex(i)} className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${index === i ? 'text-white' : 'text-white/45 hover:text-white'}`} style={index === i ? { background: `${m.color}18`, borderColor: `${m.color}66` } : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  {m.label}
                </button>
              ))}
              <button onClick={() => setIndex((index + 1) % metrics.length)} className="p-2 rounded-xl border border-white/10 bg-white/5 text-white/50 hover:text-white" title="Siguiente KPI"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <ScaleToggle scale={scale} onChange={setScale} />
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Icon className="w-4 h-4" style={{ color: metric.color }} /> {metric.label}</div>
            {highlight && <span className="text-[11px] text-white/40">Mejor mes: <strong className="text-white/75">{formatMonthShort(highlight.bestMonth)}</strong></span>}
          </div>
          <MultiMetricLineChart data={chartData} lines={[{ key: metric.key, name: metric.label, color: metric.color, format: metric.format }]} scale={scale} expanded={expanded} percentKeys={metric.format === 'percent' ? [metric.key] : []} />
          {highlight && (
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-white/45">
              <span>Mejor mes: <strong className="text-white">{formatMonthShort(highlight.bestMonth)}</strong> · {formatHistoricalMetric(highlight.bestValue, metric.format)}</span>
              <span>Actual: <strong className={highlight.vsAverage >= 0 ? 'text-emerald-300' : 'text-red-300'}>{highlight.vsAverage == null ? 'sin comparación' : `${highlight.vsAverage >= 0 ? '+' : ''}${highlight.vsAverage.toFixed(1)}% vs promedio previo`}</strong></span>
            </div>
          )}
        </div>
      )}
    </ChartCard>
  )
}

export function PlatformHistory({ platform, historical = [], campanas = [], currentMonth, theme }) {
  const navigate = useNavigate()
  const { marcaId } = useParams()
  const rows = useMemo(() => buildPlatformHistory(historical, platform, 12, currentMonth), [historical, platform, currentMonth])
  const cfg = getSocialMetricConfig(platform)
  const label = platform === 'instagram' ? 'Instagram' : platform === 'tiktok' ? 'TikTok' : 'Facebook'
  const accent = cfg[0]?.color || theme?.primary || '#6366f1'

  return (
    <div className="space-y-7">
      <SectionHeader
        icon={LineChart}
        title={`Histórico de ${label}`}
        subtitle="Lectura de tendencia y comportamiento mensual"
        accentColor={accent}
        actions={
          <button onClick={() => navigate(`/dashboard/${marcaId}/${platform}`)} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/70 hover:text-white flex items-center gap-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a {label}
          </button>
        }
      />

      <div className="glass-card rounded-2xl p-5 border border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4" style={{ color: accent }} />
          <span className="text-sm font-semibold text-white">Rendimiento de fanpage</span>
        </div>
        <FanpageHistory rows={rows} platform={platform} currentMonth={currentMonth} accent={accent} />
      </div>

      <div className="glass-card rounded-2xl p-5 border border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4" style={{ color: '#f59e0b' }} />
          <span className="text-sm font-semibold text-white">Paid Media</span>
        </div>
        <PaidMediaHistory campanas={campanas} platform={platform} currentMonth={currentMonth} accent={accent} />
      </div>
    </div>
  )
}
