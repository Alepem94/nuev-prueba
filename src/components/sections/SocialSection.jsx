import { useMemo, useState, useEffect } from 'react'
import { Facebook, Instagram, Users, Eye, Heart, TrendingUp, Megaphone, DollarSign, BarChart2, ChevronDown, ChevronUp, Target, LineChart } from 'lucide-react'
import { KPICard, KPICardSkeleton } from '../ui/KPICard'
import { SectionHeader, EmptyState } from '../ui/SectionHeader'
import { ChartCard } from '../ui/Charts'
import { PlatformInsightsCard, PaidMediaExecutiveCard, BreakdownInsightsAccordion, mergeLegacyObservations } from '../ui/EditorialInsights'
import { TopPostsSection } from '../ui/PostCard'
import { DataTable } from '../ui/DataTable'
import { CampaignToggle } from '../ui/CampaignToggle'
import { safeNumber, formatNumber, formatCurrency, formatDecimal, truncTo, prevMonth, pctChange } from '../../utils/format'
import { useNavigate, useParams } from 'react-router-dom'
import { buildCampaignPerformance, getCampaignPlatform, tipoCampanaToBucket, bucketToLabel } from '../../utils/campaigns'

const PLATFORM_CONFIG = {
  facebook:  { icon: Facebook,  accent: '#3b82f6', label: 'Facebook' },
    instagram: { icon: Instagram, accent: '#f97316', label: 'Instagram' },
}

const METRIC_STYLE = {
  'alcance':           { accent: '#22d3ee', icon: Eye },
  'reach':             { accent: '#22d3ee', icon: Eye },
  'interacción':       { accent: '#ec4899', icon: Heart },
  'interaccion':       { accent: '#ec4899', icon: Heart },
  'likes':             { accent: '#f43f5e', icon: Heart },
  'thruplays':         { accent: '#a78bfa', icon: TrendingUp },
  'visitas al perfil': { accent: '#22c55e', icon: Users },
  'views':             { accent: '#f59e0b', icon: Eye },
  'views norte':       { accent: '#f59e0b', icon: Eye },
  'views pacifico':    { accent: '#fb923c', icon: Eye },
}
function metricStyle(metrica) {
  const key = String(metrica || '').toLowerCase().trim()
  return METRIC_STYLE[key] || { accent: '#94a3b8', icon: TrendingUp }
}
function capitalize(s) {
  return s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '—'
}
const normPlat = v => String(v || '').toLowerCase().trim()
// Normaliza keys de objetivo/métrica: lowercase, trim, sin acentos
const normKey = v => String(v || '').toLowerCase().trim()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// ── Grupos únicos, mensual primero ───────────────────────────────────────────
function getGroups(rows) {
  const seen = new Map()
  for (const r of rows) {
    const tipo = r.tipo_campana || 'AON'
    const key  = tipoCampanaToBucket(tipo)
    if (!seen.has(key)) seen.set(key, tipo)
  }
  const order = ['mensual', ...([...seen.keys()].filter(k => k !== 'mensual').sort())]
  return order.filter(k => seen.has(k)).map(k => ({ key: k, label: bucketToLabel(k, seen.get(k)) }))
}

// ── Inversión de campañas para plataforma+bucket ─────────────────────────────
// bucket=null → todas las campañas de la plataforma
function campanaInversion(campanas, platform, bucket) {
  return campanas
    .filter(c => {
      const cPlat   = getCampaignPlatform(c)
      const cBucket = c._bucket || tipoCampanaToBucket(c.tipo_campana)
      return cPlat === platform && (bucket === null || cBucket === bucket)
    })
    .reduce((a, c) => a + safeNumber(c.inversion), 0)
}

// ── Inversión por objetivo dentro de un grupo ────────────────────────────────
// Cruza: plataforma + tipo_campana + objetivo_detectado ↔ objetivo
function buildObjectiveInversionMap(campanas, platform, bucket) {
  const map = {}
  campanas
    .filter(c => {
      const cPlat   = getCampaignPlatform(c)
      const cBucket = c._bucket || tipoCampanaToBucket(c.tipo_campana)
      return cPlat === platform && cBucket === bucket
    })
    .forEach(c => {
      const key = normKey(c._objective || c.objetivo_detectado || c.objetivo || '')
      if (!key) return
      map[key] = (map[key] || 0) + safeNumber(c.inversion)
    })
  return map
}

// ── Inversión por objetivo a nivel plataforma (todos los buckets) ────────────
function buildPlatformObjectiveInversionMap(campanas, platform) {
  const map = {}
  campanas
    .filter(c => getCampaignPlatform(c) === platform)
    .forEach(c => {
      const key = normKey(c._objective || c.objetivo_detectado || c.objetivo || '')
      if (!key) return
      map[key] = (map[key] || 0) + safeNumber(c.inversion)
    })
  return map
}

// ── CPR Meta desde Proyecciones: promedio de cpr_meta por objetivo a nivel plataforma ──
function buildPlatformCPRMeta(proyecciones, platform) {
  const map = {} // objetivoKey → { sum, count }
  for (const r of proyecciones) {
    if (normPlat(r.plataforma) !== platform) continue
    const cpr = safeNumber(r.cpr_meta)
    if (cpr <= 0) continue
    const objKey = normKey(r.objetivo || r.metrica || '')
    if (!objKey) continue
    if (!map[objKey]) map[objKey] = { sum: 0, count: 0 }
    map[objKey].sum += cpr
    map[objKey].count += 1
  }
  const result = {}
  for (const [key, val] of Object.entries(map)) {
    result[key] = val.count > 0 ? val.sum / val.count : 0
  }
  return result
}

// ── CPR Meta a nivel grupo: lee cpr_meta de la fila exacta ──────────────────
function getGroupCPRMeta(proyecciones, platform, bucket, objKey) {
  const rows = proyecciones.filter(r => {
    return normPlat(r.plataforma) === platform
      && tipoCampanaToBucket(r.tipo_campana || 'AON') === bucket
      && normKey(r.objetivo || r.metrica || '') === objKey
  })
  if (rows.length === 0) return null
  // Tomar el cpr_meta de la primera fila que lo tenga
  for (const r of rows) {
    const cpr = safeNumber(r.cpr_meta)
    if (cpr > 0) return cpr
  }
  return null
}

// ═══════════════════════════════════════════════════════════════════════════════
// PaidMediaSection — reutilizable para FB, IG y TikTok
// ═══════════════════════════════════════════════════════════════════════════════

// Helper: detecta si la métrica es de tipo "alcance" → CPM (por mil)
const isCPM = (metrica) => {
  const k = normKey(metrica || '')
  return k.includes('alcance') || k.includes('reach')
}

// Helper: nombre del CPR según la métrica
const cprLabel = (metrica) => {
  const k = normKey(metrica || '')
  if (k.includes('alcance') || k.includes('reach')) return 'CPM (x1,000)'
  if (k.includes('interacc') || k.includes('interaccion')) return 'CPI (Interacción)'
  if (k.includes('view')) return 'CPV (View)'
  if (k.includes('like')) return 'CPL (Like)'
  if (k.includes('thruplay')) return 'CPTV (ThruPlay)'
  if (k.includes('visitas')) return 'CPVP (Visita Perfil)'
  return `CPR (${capitalize(metrica)})`
}

function projectionKeys(row) {
  return [...new Set([row?.objetivo, row?.metrica].map(normKey).filter(Boolean))]
}

function findCampaignPerformance(performanceMap, row) {
  for (const key of projectionKeys(row)) {
    if (performanceMap[key]) return performanceMap[key]
  }
  return null
}

export function PaidMediaSection({ platform, month, campanas, allCampanas = [], proyecciones, accent, hallazgos = [], observaciones = [] }) {
  const [bucket, setBucket] = useState('mensual')
  const paidHallazgos = useMemo(() => mergeLegacyObservations(
    (hallazgos || []).filter(h => String(h.seccion || '').toLowerCase() === `${platform}-paid`),
    (observaciones || []).filter(o => String(o.seccion || '').toLowerCase() === `${platform}-paid`)
  ), [hallazgos, observaciones, platform])

  // Proyecciones de esta plataforma y mes (marca ya filtrada por el hook)
  const platProy = useMemo(
    () => (proyecciones || []).filter(p => normPlat(p.plataforma) === platform && p.mes === month),
    [proyecciones, platform, month]
  )

  // Previous month proyecciones for variation
  const pm = prevMonth(month)
  const prevPlatProy = useMemo(
    () => (proyecciones || []).filter(p => normPlat(p.plataforma) === platform && p.mes === pm),
    [proyecciones, platform, pm]
  )
  const py = month ? `${Number(String(month).slice(0, 4)) - 1}-${String(month).slice(5, 7)}` : null

  const inversionTotal = useMemo(() => campanaInversion(campanas, platform, null), [campanas, platform])
  const platformPerformance = useMemo(
    () => buildCampaignPerformance(campanas, platform, null),
    [campanas, platform]
  )
  const prevPlatformPerformance = useMemo(
    () => buildCampaignPerformance((allCampanas || []).filter(r => r.mes === pm), platform, null),
    [allCampanas, platform, pm]
  )
  const yearPlatformPerformance = useMemo(
    () => buildCampaignPerformance((allCampanas || []).filter(r => r.mes === py), platform, null),
    [allCampanas, platform, py]
  )

  const groups = useMemo(() => getGroups(platProy), [platProy])

  // Auto-select first bucket that has data if 'mensual' has none
  useEffect(() => {
    if (groups.length > 0 && !groups.some(g => g.key === bucket)) {
      setBucket(groups[0].key)
    }
  }, [groups, bucket])

  if (platProy.length === 0 && inversionTotal === 0) return null

  // Totales del mes agrupados por MÉTRICA (no suma única)
  const metricTotals = useMemo(() => {
    const metaByKey = {}
    const labelByKey = {}
    for (const r of platProy) {
      const key = normKey(r.metrica || r.objetivo || '')
      if (!key) continue
      metaByKey[key] = (metaByKey[key] || 0) + safeNumber(r.meta)
      labelByKey[key] = r.metrica || r.objetivo
    }
    return Object.entries(platformPerformance)
      .map(([key, actual]) => ({
        metrica: labelByKey[key] || actual.metrica || actual.objetivo,
        resultado: actual.resultado,
        meta: metaByKey[key] || 0,
      }))
      .filter(m => m.resultado > 0)
      .sort((a, b) => b.resultado - a.resultado)
  }, [platProy, platformPerformance])

  // Previous month totals by metric (for vs anterior badge)
  const prevMetricMap = useMemo(() => {
    const map = {}
    for (const [key, actual] of Object.entries(prevPlatformPerformance)) map[key] = actual.resultado
    return map
  }, [prevPlatformPerformance])

  const yearMetricMap = useMemo(() => {
    const map = {}
    for (const [key, actual] of Object.entries(yearPlatformPerformance)) map[key] = actual.resultado
    return map
  }, [yearPlatformPerformance])

  // ── Mapa inversión por objetivo a nivel plataforma (todos los grupos) ──
  const platObjInvMap = useMemo(
    () => buildPlatformObjectiveInversionMap(campanas, platform),
    [campanas, platform]
  )

  // ── CPR por métrica a nivel plataforma: inversión(objetivo) / resultado(objetivo) ──
  // Intenta matchear por metrica Y por objetivo (pueden tener nombres distintos)
  const metricObjectiveMap = useMemo(() => {
    const metricToObj = {}
    const objToMetric = {}
    for (const r of platProy) {
      const mk = normKey(r.metrica || '')
      const ok = normKey(r.objetivo || '')
      if (mk && ok) { metricToObj[mk] = ok; objToMetric[ok] = mk }
    }
    return { metricToObj, objToMetric }
  }, [platProy])

  const platformCPRs = useMemo(() => {
    const { metricToObj, objToMetric } = metricObjectiveMap
    const result = metricTotals.map(m => {
      const key = normKey(m.metrica || '')
      // Buscar inversión: primero por key directo, luego por objetivo mapeado
      const altKey = metricToObj[key] || objToMetric[key]
      const inv = platObjInvMap[key] || (altKey ? platObjInvMap[altKey] : 0)
      // CPM: (inversión / alcance) × 1000; otros: inversión / resultado
      const cpr = m.resultado > 0
        ? isCPM(m.metrica) ? (inv / m.resultado) * 1000 : inv / m.resultado
        : 0
      return { metrica: m.metrica, key, cpr, inv }
    }).filter(c => c.cpr > 0)

    return result
  }, [metricTotals, platObjInvMap, metricObjectiveMap])

  // ── CPR Meta a nivel plataforma (promedio desde sheet) ──
  const platCPRMetaMap = useMemo(
    () => buildPlatformCPRMeta(platProy, platform),
    [platProy, platform]
  )

  const groupPerformance = useMemo(
    () => buildCampaignPerformance(campanas, platform, bucket),
    [campanas, platform, bucket]
  )

  // Filas del grupo seleccionado
  const groupRows = useMemo(
    () => platProy
      .filter(r => tipoCampanaToBucket(r.tipo_campana || 'AON') === bucket)
      .map(r => {
        const actual = findCampaignPerformance(groupPerformance, r)
        return {
          ...r,
          _realFromCampaign: actual?.resultado || 0,
          _invFromCampaign: actual?.inversion || 0,
        }
      })
      .sort((a, b) => safeNumber(b._realFromCampaign) - safeNumber(a._realFromCampaign)),
    [platProy, bucket, groupPerformance]
  )

  // Mapa objetivo → inversión para el grupo actual
  const objInvMap = useMemo(
    () => buildObjectiveInversionMap(campanas, platform, bucket),
    [campanas, platform, bucket]
  )

  const groupInversion = useMemo(() => campanaInversion(campanas, platform, bucket), [campanas, platform, bucket])
  const groupLabel     = groups.find(g => g.key === bucket)?.label || bucket
  const prevInversion = useMemo(() => campanaInversion((allCampanas || []).filter(r => r.mes === pm), platform, null), [allCampanas, platform, pm])
  const yearInversion = useMemo(() => campanaInversion((allCampanas || []).filter(r => r.mes === py), platform, null), [allCampanas, platform, py])

  // Subtítulo del header
  const subtitle = [
    inversionTotal > 0 ? `${formatCurrency(inversionTotal)} inversión` : '',
    metricTotals.length > 0 ? `${metricTotals.length} métrica${metricTotals.length !== 1 ? 's' : ''}` : '',
    groups.length > 1 ? `${groups.length} grupos` : '',
  ].filter(Boolean).join(' · ')

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${accent}33` }}>
      <div className="flex items-center gap-3 px-5 py-4" style={{ background: `${accent}14` }}>
        <div className="p-2 rounded-xl" style={{ background: `${accent}25` }}>
          <BarChart2 className="w-4 h-4" style={{ color: accent }} />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Paid Media</p>
          {subtitle && <p className="text-[11px] text-white/50">{subtitle}</p>}
        </div>
      </div>

      <div className="p-5 space-y-6" style={{ background: 'rgba(0,0,0,0.28)' }}>

          {/* ── Totales del mes + lectura ejecutiva ── */}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)] gap-4 items-stretch">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-3">
                Totales del mes
              </p>
              <div className={`grid gap-3 ${
                metricTotals.length === 0 ? 'grid-cols-1' :
                (metricTotals.length + 1) <= 2 ? 'grid-cols-2' :
                (metricTotals.length + 1) <= 3 ? 'grid-cols-3' :
                'grid-cols-2 lg:grid-cols-4'
              }`}>
              {inversionTotal > 0 && (
                <KPICard title="Inversión Total" value={inversionTotal} icon={DollarSign}
                  accentColor="#f59e0b" formatter={formatCurrency}
                  variation={prevInversion > 0 ? pctChange(inversionTotal, prevInversion) : null}
                  variationYear={yearInversion > 0 ? pctChange(inversionTotal, yearInversion) : null}
                  delay={0} />
              )}
              {metricTotals.map((m, i) => {
                const s = metricStyle(m.metrica)
                const key = normKey(m.metrica || '')
                const prevVal = prevMetricMap[key] || 0
                const yearVal = yearMetricMap[key] || 0
                const varVsAnt = prevVal > 0 ? pctChange(m.resultado, prevVal) : null
                const varVsYear = yearVal > 0 ? pctChange(m.resultado, yearVal) : null
                const varVsProy = m.meta > 0 ? pctChange(m.resultado, m.meta) : null
                return (
                  <KPICard key={m.metrica} title={capitalize(m.metrica)} value={m.resultado}
                    icon={s.icon} accentColor={s.accent}
                    variation={varVsAnt}
                    variationYear={varVsYear}
                    variationProj={varVsProy}
                    delay={i + 1} />
                )
              })}
              </div>
            </div>
            {paidHallazgos.length > 0 && <PaidMediaExecutiveCard items={paidHallazgos} accent={accent} />}
          </div>

          {/* ── CPR por objetivo a nivel plataforma ── */}
          {platformCPRs.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-3">
                Costo por resultado — Plataforma
              </p>
              <div className={`grid gap-3 ${
                platformCPRs.length <= 2 ? 'grid-cols-2' :
                platformCPRs.length <= 3 ? 'grid-cols-3' :
                'grid-cols-2 lg:grid-cols-4'
              }`}>
                {platformCPRs.map((c, i) => {
                  const s = metricStyle(c.metrica)
                  const metaVal = platCPRMetaMap[c.key]
                  const variation = metaVal && metaVal > 0 ? pctChange(c.cpr, metaVal) : null
                  const altKey = metricObjectiveMap.metricToObj[c.key] || metricObjectiveMap.objToMetric[c.key]
                  const yearActual = yearPlatformPerformance[c.key] || (altKey ? yearPlatformPerformance[altKey] : null)
                  const yearInv = yearActual?.inversion || 0
                  const yearResult = yearActual?.resultado || 0
                  const yearCpr = yearResult > 0 ? (isCPM(c.metrica) ? (yearInv / yearResult) * 1000 : yearInv / yearResult) : 0
                  const variationYear = yearCpr > 0 ? pctChange(c.cpr, yearCpr) : null
                  return (
                    <KPICard
                      key={`cpr-${c.key}`}
                      title={cprLabel(c.metrica)}
                      value={c.cpr}
                      icon={Target}
                      accentColor={s.accent}
                      formatter={v => `$${formatDecimal(v, 2)}`}
                      variation={variation}
                      variationYear={variationYear}
                      lowerIsBetter
                      subtitle={metaVal > 0 ? `Meta: $${formatDecimal(metaVal, 2)}` : undefined}
                      delay={i}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {paidHallazgos.length > 0 && (
            <BreakdownInsightsAccordion items={paidHallazgos} accent={accent} />
          )}

          {/* ── Desglose por grupo ── */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-3">
              Desglose por grupo
            </p>

            {groups.length > 1 && (
              <div className="mb-4">
                <CampaignToggle buckets={groups} selected={bucket} onChange={setBucket} accentColor={accent} />
              </div>
            )}

            {/* Inversión del grupo */}
            {groupInversion > 0 && (
              <div className="mb-4">
                <KPICard title={`Inversión — ${groupLabel}`} value={groupInversion}
                  icon={DollarSign} accentColor="#f59e0b" formatter={formatCurrency} delay={0} />
              </div>
            )}

            {/* Tabla: Objetivo | Métrica | Resultado | Meta | vs Meta | Inversión | CPR | CPR vs Meta */}
            {groupRows.length > 0 ? (
              <DataTable
                columns={[
                  { key: 'objetivo', label: 'Objetivo', bold: true,
                    render: v => <span className="capitalize">{v || '—'}</span> },
                  { key: 'metrica', label: 'Métrica',
                    render: v => <span className="text-white/60 text-xs capitalize">{v || '—'}</span> },
                  { key: '_realFromCampaign', label: 'Resultado', align: 'right',
                    render: v => safeNumber(v) > 0 ? formatNumber(v) : <span className="text-white/30">—</span> },
                  { key: 'meta', label: 'Meta', align: 'right',
                    render: v => safeNumber(v) > 0 ? formatNumber(v) : <span className="text-white/30">—</span> },
                  { key: '_vs', label: 'vs Meta', align: 'right',
                    render: (_, r) => {
                      const meta = safeNumber(r.meta), real = safeNumber(r._realFromCampaign)
                      if (!meta || !real) return <span className="text-white/30">—</span>
                      const pct = ((real / meta) - 1) * 100
                      return <span className={pct >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                        {pct >= 0 ? '+' : ''}{truncTo(pct, 2)}%
                      </span>
                    },
                  },
                  { key: '_inv', label: 'Inversión', align: 'right',
                    render: (_, r) => {
                      const inv = safeNumber(r._invFromCampaign)
                      return inv > 0 ? formatCurrency(inv) : <span className="text-white/30">—</span>
                    },
                  },
                  { key: '_cpr', label: 'CPR', align: 'right',
                    render: (_, r) => {
                      const metricKey = normKey(r.metrica || r.objetivo || '')
                      const objKey = normKey(r.objetivo || '')
                      const inv = safeNumber(r._invFromCampaign)
                      const real = safeNumber(r._realFromCampaign)
                      if (!inv || !real) return <span className="text-white/30">—</span>
                      const cpr = isCPM(r.metrica || r.objetivo) ? (inv / real) * 1000 : inv / real
                      return (
                        <div>
                          <div className="text-sm font-mono text-amber-200">${formatDecimal(cpr, 2)}</div>
                          {isCPM(r.metrica || r.objetivo) && <div className="text-[10px] text-white/40">x1,000</div>}
                        </div>
                      )
                    },
                  },
                  { key: '_cpr_vs', label: 'CPR vs Meta', align: 'right',
                    render: (_, r) => {
                      const metricKey = normKey(r.metrica || r.objetivo || '')
                      const objKey = normKey(r.objetivo || '')
                      const inv = safeNumber(r._invFromCampaign)
                      const real = safeNumber(r._realFromCampaign)
                      if (!inv || !real) return <span className="text-white/30">—</span>
                      const cprReal = isCPM(r.metrica || r.objetivo) ? (inv / real) * 1000 : inv / real
                      // Leer CPR meta del sheet (cpr_meta de la fila de proyección de este grupo)
                      const cprMeta = getGroupCPRMeta(platProy, platform, bucket, metricKey)
                        || getGroupCPRMeta(platProy, platform, bucket, objKey)
                      if (!cprMeta) return <span className="text-white/30">—</span>
                      // Variación: si CPR real < meta → bueno (positivo), CPR real > meta → malo (negativo)
                      const pct = ((cprMeta - cprReal) / cprMeta) * 100
                      return (
                        <span className={pct >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                          {pct >= 0 ? '+' : ''}{truncTo(pct, 2)}%
                        </span>
                      )
                    },
                  },
                ]}
                data={groupRows}
              />
            ) : (
              <p className="text-white/40 text-sm text-center py-4">
                Sin datos para este grupo en el mes seleccionado
              </p>
            )}
          </div>

      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SocialSection principal (Facebook e Instagram)
// ═══════════════════════════════════════════════════════════════════════════════
export function SocialSection({
  platform, data, campanas = [], allCampanas = [], proyecciones = [], topPosts = [],
  observaciones, historical = [], loading, hallazgos = [],
}) {
  const cfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.facebook
  const navigate = useNavigate()
  const { marcaId } = useParams()
  const activeMonth = data?.mes || null

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <SectionHeader icon={cfg.icon} title={cfg.label} subtitle="Sin datos para este mes" accentColor={cfg.accent} />
        <EmptyState icon={cfg.icon} title="Sin datos disponibles"
          message="No hay información registrada para esta plataforma en el mes seleccionado." />
      </div>
    )
  }

  const engagement = (Math.floor(safeNumber(data.engagement_rate) * 10000) / 100).toFixed(2)

  // Previous month data for variation badges
  const pm = prevMonth(data?.mes)
  const prevData = (historical || []).find(r => r.mes === pm)
  const prevEngagement = prevData ? (Math.floor(safeNumber(prevData.engagement_rate) * 10000) / 100) : null
  const yearMonth = activeMonth ? `${Number(String(activeMonth).slice(0, 4)) - 1}-${String(activeMonth).slice(5, 7)}` : null
  const yearData = (historical || []).find(r => r.mes === yearMonth)
  const yearEngagement = yearData ? (Math.floor(safeNumber(yearData.engagement_rate) * 10000) / 100) : null



  const primaryKpis = [
    { key: 'seguidores',    title: 'Seguidores',    value: safeNumber(data.seguidores),    icon: Users,      accent: cfg.accent, variation: pctChange(data.seguidores, prevData?.seguidores), variationYear: pctChange(data.seguidores, yearData?.seguidores) },
    { key: 'alcance',       title: 'Alcance',       value: safeNumber(data.alcance),       icon: Eye,        accent: '#22d3ee',  variation: pctChange(data.alcance, prevData?.alcance), variationYear: pctChange(data.alcance, yearData?.alcance) },
    { key: 'interacciones', title: 'Interacciones', value: safeNumber(data.interacciones), icon: Heart,      accent: '#ec4899',  variation: pctChange(data.interacciones, prevData?.interacciones), variationYear: pctChange(data.interacciones, yearData?.interacciones) },
    { key: 'engagement',    title: 'Engagement',    value: engagement,                     icon: TrendingUp, accent: '#22c55e', suffix: '%', fmt: v => v, variation: pctChange(parseFloat(engagement), prevEngagement), variationYear: pctChange(parseFloat(engagement), yearEngagement) },
  ]

  const secondaryKpis = [
    { key: 'nuevos_seguidores', title: 'Nuevos Seguidores', value: safeNumber(data.nuevos_seguidores), icon: Users,     accent: cfg.accent },
    { key: 'publicaciones',     title: 'Publicaciones',     value: safeNumber(data.publicaciones),     icon: Megaphone, accent: '#a78bfa' },
    { key: 'impresiones',       title: 'Impresiones',       value: safeNumber(data.impresiones),       icon: Eye,       accent: '#22d3ee' },
  ].filter(k => k.value > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SectionHeader icon={cfg.icon} title={cfg.label} subtitle="Métricas de desempeño" accentColor={cfg.accent} />
      </div>

      <PlatformInsightsCard
        items={mergeLegacyObservations(
          (hallazgos || []).filter(h => String(h.seccion || '').toLowerCase() === platform),
          (observaciones || []).filter(o => String(o.seccion || '').toLowerCase() === platform)
        )}
        accent={cfg.accent}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryKpis.map((k, i) => (
          <KPICard key={k.key} title={k.title} value={k.value} icon={k.icon}
            accentColor={k.accent} suffix={k.suffix} formatter={k.fmt} variation={k.variation} variationYear={k.variationYear} delay={i} />
        ))}
      </div>

      {secondaryKpis.length > 0 && (
        <div className={`grid gap-4 ${
          secondaryKpis.length === 1 ? 'grid-cols-1 sm:max-w-xs' :
          secondaryKpis.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {secondaryKpis.map((k, i) => (
            <KPICard key={k.key} title={k.title} value={k.value} icon={k.icon}
              accentColor={k.accent} delay={4 + i} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${cfg.accent}18`, border: `1px solid ${cfg.accent}30` }}>
            <LineChart className="w-4 h-4" style={{ color: cfg.accent }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">¿Quieres analizar el histórico?</p>
            <p className="text-xs text-white/45">Consulta fanpage y Paid Media por mes, con selección de KPIs.</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/dashboard/${marcaId}/${platform}/historico`)}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white border transition hover:scale-[1.01]"
          style={{ background: `${cfg.accent}18`, borderColor: `${cfg.accent}55` }}
        >Ver histórico →</button>
      </div>

      <PaidMediaSection
        platform={platform}
        month={activeMonth}
        campanas={campanas}
        allCampanas={allCampanas}
        proyecciones={proyecciones}
        accent={cfg.accent}
        hallazgos={hallazgos}
        observaciones={observaciones}
      />

      <TopPostsSection posts={topPosts} platform={platform} />
    </div>
  )
}
