import { motion } from 'framer-motion'
import { Brain, Check, Lightbulb, Sparkles, Target, Trophy, AlertTriangle } from 'lucide-react'
import { SectionHeader, EmptyState } from '../ui/SectionHeader'
import { safeNumber } from '../../utils/format'
import { splitEditorialInsights } from '../ui/EditorialInsights'

const ACCENT = '#facc15'

const norm = v => String(v || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const KEY_TYPES = new Set(['clave', 'key', 'key insight', 'hallazgo clave', 'headline', 'resumen'])
const OBS_TYPES = new Set(['observacion', 'observation', 'observaciones'])
const LEARNING_TYPES = new Set(['aprendizaje', 'learning', 'aprendizajes'])

function bullets(item) {
  return String(item?.descripcion || item?.observacion || '')
    .split(/\r?\n/)
    .map(s => s.trim().replace(/^(?:[-•*·]|\d+[.)])\s*/, ''))
    .filter(Boolean)
}

function typeColor(type) {
  const t = norm(type)
  if (t === 'observacion') return '#60a5fa'
  if (t === 'aprendizaje') return '#34d399'
  if (t === 'logro') return '#22c55e'
  if (t === 'alerta' || t === 'riesgo') return '#ef4444'
  if (t === 'oportunidad') return '#38bdf8'
  return ACCENT
}

export function HallazgosSection({ data = [], loading, theme }) {
  if (loading) {
    return <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="rounded-2xl skeleton h-40" />)}</div>
  }

  if (!data?.length) {
    return (
      <div className="space-y-6">
        <SectionHeader icon={Sparkles} title="Hallazgos & Conclusiones" subtitle="Sin hallazgos registrados" accentColor={ACCENT} />
        <EmptyState icon={Sparkles} title="Sin hallazgos" message="No hay hallazgos registrados para el mes seleccionado." />
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => safeNumber(a.prioridad, 99) - safeNumber(b.prioridad, 99))
  const keyItems = sorted.filter(h => KEY_TYPES.has(norm(h.tipo)))
  const observations = sorted.filter(h => OBS_TYPES.has(norm(h.tipo)))
  const learnings = sorted.filter(h => LEARNING_TYPES.has(norm(h.tipo)))
  const legacy = sorted.filter(h => !KEY_TYPES.has(norm(h.tipo)) && !OBS_TYPES.has(norm(h.tipo)) && !LEARNING_TYPES.has(norm(h.tipo)))
  const legacyObservations = legacy.filter(h => /observ|alerta|riesgo/i.test(h.tipo || ''))
  const legacyLearnings = legacy.filter(h => /aprend|insight|oportunidad|recomend/i.test(h.tipo || ''))
  const otherLegacy = legacy.filter(h => !legacyObservations.includes(h) && !legacyLearnings.includes(h))

  const sectionLabel = section => {
    const s = norm(section)
    if (s === 'overview') return 'Overview'
    if (s === 'facebook') return 'Facebook'
    if (s === 'instagram') return 'Instagram'
    if (s === 'tiktok') return 'TikTok'
    if (s === 'google-ads') return 'Google Ads'
    if (s.endsWith('-paid')) return `${section.replace('-paid', '')} · Paid Media`
    return section || 'General'
  }

  return (
    <div className="space-y-7">
      <SectionHeader
        icon={Brain}
        title="Hallazgos & Conclusiones"
        subtitle="Observaciones y aprendizajes del periodo"
        accentColor={ACCENT}
      />

      {keyItems.length > 0 && (
        <section>
          <SectionTitle icon={Lightbulb} title="Hallazgos clave" accent={ACCENT} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {keyItems.map((h, i) => (
              <motion.article key={`key-${i}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="absolute left-0 inset-y-4 w-1 rounded-r-full" style={{ background: theme?.primary || ACCENT }} />
                <div className="pl-2">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: theme?.primary || ACCENT }}>Hallazgo clave</span>
                    <span className="text-[10px] text-white/30">{sectionLabel(h.seccion)}</span>
                  </div>
                  <h3 className="text-base font-semibold font-display text-white leading-snug">{h.titulo || 'Hallazgo'}</h3>
                  {bullets(h).length > 0 && <BulletList items={bullets(h)} accent={theme?.primary || ACCENT} />}
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EditorialColumn title="Observaciones" subtitle="Qué ocurrió y qué se detectó" items={observations} legacy={legacyObservations} accent="#60a5fa" icon={AlertTriangle} sectionLabel={sectionLabel} />
        <EditorialColumn title="Aprendizajes" subtitle="Qué nos llevamos para optimizar" items={learnings} legacy={legacyLearnings} accent="#34d399" icon={Check} sectionLabel={sectionLabel} />
      </div>

      {otherLegacy.length > 0 && (
        <section>
          <SectionTitle icon={Target} title="Otros hallazgos" accent={ACCENT} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {otherLegacy.map((h, i) => (
              <div key={`legacy-${i}`} className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: typeColor(h.tipo) }}>{h.tipo || 'Hallazgo'}</span>
                  <span className="text-[10px] text-white/30">{sectionLabel(h.seccion)}</span>
                </div>
                <p className="text-sm font-semibold text-white">{h.titulo || h.descripcion || h.observacion}</p>
                {h.titulo && bullets(h).length > 0 && <BulletList items={bullets(h)} accent={typeColor(h.tipo)} />}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function EditorialColumn({ title, subtitle, items, legacy, accent, icon: Icon, sectionLabel }) {
  const merged = [...items, ...legacy]
  if (!merged.length) return null
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex items-start gap-3 mb-5">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: `${accent}16`, color: accent }}><Icon className="w-4 h-4" /></span>
        <div><h3 className="text-sm font-bold font-display text-white">{title}</h3><p className="text-[11px] text-white/40 mt-0.5">{subtitle}</p></div>
      </div>
      <div className="space-y-3">
        {merged.map((h, i) => (
          <motion.div key={`${h.titulo}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: accent }}>{sectionLabel(h.seccion)}</span>
              {h.tipo && <span className="text-[9px] uppercase tracking-wider text-white/25">{h.tipo}</span>}
            </div>
            {h.titulo && <p className="text-sm font-semibold text-white leading-snug mb-2">{h.titulo}</p>}
            <BulletList items={bullets(h)} accent={accent} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function SectionTitle({ icon: Icon, title, accent }) {
  return <div className="flex items-center gap-2 mb-3"><Icon className="w-4 h-4" style={{ color: accent }} /><h3 className="text-xs uppercase tracking-[0.16em] font-bold text-white/60">{title}</h3></div>
}

function BulletList({ items, accent }) {
  if (!items?.length) return null
  return <ul className="mt-2 space-y-1.5">{items.map((item, i) => <li key={`${item}-${i}`} className="flex gap-2 text-xs sm:text-sm text-white/60 leading-relaxed"><span className="mt-[0.45rem] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} /><span>{item}</span></li>)}</ul>
}
