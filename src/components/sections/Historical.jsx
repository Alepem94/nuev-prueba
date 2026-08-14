import { useMemo, useState } from 'react'
import {
  Activity, ArrowLeft, BarChart3, ChevronLeft, ChevronRight, Eye, Heart, LineChart, Target, Users, Wallet, Zap,
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

function PaidMediaHistory({ campanas, platform, currentMonth, accent }) {
  const paid = useMemo(() => buildPaidMediaHistory(campanas, platform, 12, currentMonth), [campanas, platform, currentMonth])
  const metrics = paid.metrics
  const [mode, setMode] = useState('objective')
  const [view, setView] = useState('results')
  const [selected, setSelected] = useState(() => metrics.slice(0, Math.min(1, metrics.length)).map(m => m.key))
  const [scale, setScale] = useState('linear')

  const effectiveSelected = selected

  const totalSpendSelected = effectiveSelected.includes('__total_spend__')
  const activeMetrics = metrics.filter(m => effectiveSelected.includes(m.key))
  const resultLines = activeMetrics.map(m => ({ key: `result_${m.key}`, name: m.label, color: m.color }))
  const spendLines = activeMetrics.map(m => ({ key: `spend_${m.key}`, name: `Inversión · ${m.label}`, color: '#f59e0b', format: 'currency' }))
  const cprLines = activeMetrics.map(m => ({ key: `cpr_${m.key}`, name: `Costo · ${m.label}`, color: '#34d399', format: 'currency' }))
  const totalSpendLine = { key: 'spend_total', name: 'Inversión total', color: '#f59e0b', format: 'currency' }
  const totalResultLine = { key: 'result_total', name: 'Resultado total', color: '#22d3ee' }

  // In "Por objetivo" mode, the fast analysis is intentionally a three-line
  // combo: result + investment + efficiency for the selected objective.
  // In "Por KPI" mode the user chooses one analytical family at a time.
  let lines = mode === 'objective' ? [...resultLines, ...spendLines, ...cprLines] : resultLines
  if (mode === 'kpi' && view === 'spend') lines = totalSpendSelected ? [totalSpendLine] : spendLines
  if (mode === 'kpi' && view === 'results' && effectiveSelected.includes('__total_results__')) lines = [totalResultLine]
  if (mode === 'kpi' && view === 'efficiency') lines = cprLines

  const switchMode = nextMode => {
    setMode(nextMode)
    setSelected(metrics.slice(0, Math.min(1, metrics.length)).map(m => m.key))
    setView('results')
  }

  const toggleMetric = key => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const selectObjective = key => setSelected([key])

  const objectiveSummary = mode === 'objective' && activeMetrics.length === 1 ? activeMetrics[0] : null
  const title = mode === 'objective'
    ? `Objetivo: ${objectiveSummary?.label || 'seleccionado'}`
    : view === 'results' ? 'Resultados pagados' : view === 'spend' ? 'Inversión pagada' : 'Costo por resultado'
  const subtitle = mode === 'objective'
    ? 'Resultado + inversión + eficiencia mensual'
    : 'Comparación mensual de las métricas seleccionadas'

  return (
    <section className="space-y-4 pt-2">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-white">Rendimiento de Paid Media</h2>
          <p className="text-xs text-white/45 mt-1">Analiza resultados, inversión o eficiencia por objetivo sin mezclar unidades en un mismo eje.</p>
        </div>
        <ScaleToggle scale={scale} onChange={setScale} />
      </div>

      {metrics.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-white/40 text-sm">No hay campañas históricas para esta plataforma.</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => switchMode('objective')} className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${mode === 'objective' ? 'bg-white/12 text-white border-white/20' : 'bg-white/5 text-white/45 border-white/10'}`}>Por objetivo</button>
            <button onClick={() => switchMode('kpi')} className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${mode === 'kpi' ? 'bg-white/12 text-white border-white/20' : 'bg-white/5 text-white/45 border-white/10'}`}>Por KPI</button>
            {mode === 'kpi' && <>
              <div className="w-px h-8 bg-white/10 mx-1" />
              <button onClick={() => setView('results')} className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${view === 'results' ? 'text-white border-cyan-400/30 bg-cyan-400/10' : 'text-white/45 border-white/10 bg-white/5'}`}>Resultados</button>
              <button onClick={() => setView('spend')} className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${view === 'spend' ? 'text-white border-amber-400/30 bg-amber-400/10' : 'text-white/45 border-white/10 bg-white/5'}`}>Inversión</button>
              <button onClick={() => setView('efficiency')} className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${view === 'efficiency' ? 'text-white border-emerald-400/30 bg-emerald-400/10' : 'text-white/45 border-white/10 bg-white/5'}`}>Eficiencia</button>
            </>}
          </div>

          {mode === 'objective' ? (
            <div className="flex flex-wrap gap-2">
              {metrics.map(metric => (
                <button key={metric.key} onClick={() => selectObjective(metric.key)} className={`px-3 py-2 rounded-xl border text-xs font-semibold transition ${effectiveSelected.includes(metric.key) ? 'text-white' : 'text-white/45 hover:text-white'}`} style={effectiveSelected.includes(metric.key) ? { background: `${metric.color}18`, borderColor: `${metric.color}66` } : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                  <span className="w-2 h-2 inline-block rounded-full mr-2" style={{ background: metric.color }} />
                  Campañas de {metric.label.toLowerCase()}
                </button>
              ))}
            </div>
          ) : (
            <>
              <MetricSelector metrics={metrics.map(m => ({ ...m, label: m.label }))} selected={effectiveSelected} onToggle={key => {
                if (key === '__all__') return setSelected(metrics.map(m => m.key))
                if (key === '__clear__') return setSelected([])
                toggleMetric(key)
              }} accent={accent} />
              {view === 'spend' && (
                <div className="pt-1">
                  <button onClick={() => setSelected(['__total_spend__'])} className={`px-3 py-2 rounded-xl border text-xs font-semibold transition ${effectiveSelected.includes('__total_spend__') ? 'text-white bg-amber-400/10 border-amber-400/30' : 'text-white/45 bg-white/5 border-white/10'}`}>Ver inversión total de la red</button>
                </div>
              )}
              {view === 'results' && (
                <div className="pt-1">
                  <button onClick={() => setSelected(['__total_results__'])} className={`px-3 py-2 rounded-xl border text-xs font-semibold transition ${effectiveSelected.includes('__total_results__') ? 'text-white bg-cyan-400/10 border-cyan-400/30' : 'text-white/45 bg-white/5 border-white/10'}`}>Ver resultado total de la red</button>
                </div>
              )}
            </>
          )}

          {mode === 'objective' && objectiveSummary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MiniPaidCard title={objectiveSummary.label} value="Resultado" icon={Target} color={objectiveSummary.color} />
              <MiniPaidCard title="Inversión" value="Inversión" icon={Wallet} color="#f59e0b" />
              <MiniPaidCard title="Eficiencia" value={objectiveSummary.label.toLowerCase().includes('alcance') ? 'CPM' : 'Costo / resultado'} icon={Zap} color="#34d399" />
            </div>
          )}

          <ChartCard title={title} subtitle={`${subtitle} · meses sin actividad quedan como ausencia, no como cero`} allowLogScale={false}>
            {({ expanded }) => (
              <MultiMetricLineChart data={paid.series} lines={lines} scale={scale} expanded={expanded} connectNulls percentKeys={[]} />
            )}
          </ChartCard>

          <PaidMediaLegendNote view={view} />
        </>
      )}
    </section>
  )
}

function MiniPaidCard({ title, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 font-semibold"><Icon className="w-3.5 h-3.5" style={{ color }} /> {value}</div>
      <p className="text-sm font-semibold text-white mt-2">{title}</p>
      <p className="text-xs text-white/40 mt-1">La selección controla la gráfica de abajo.</p>
    </div>
  )
}

function PaidMediaLegendNote({ view }) {
  const text = view === 'results'
    ? 'Resultados: suma de la columna Resultado de Campañas por mes.'
    : view === 'spend'
      ? 'Inversión: suma del gasto registrado en Campañas por mes.'
      : 'Eficiencia: CPM para alcance y costo por resultado para los demás objetivos.'
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
