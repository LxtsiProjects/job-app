const STAGES = [
  { key: 'new', label: 'New', color: 'bg-stageNew' },
  { key: 'applied', label: 'Applied', color: 'bg-stageApplied' },
  { key: 'interview', label: 'Interview', color: 'bg-stageInterview' },
  { key: 'offer', label: 'Offer', color: 'bg-stageOffer' },
]

/**
 * counts: { new, applied, interview, offer }
 * A stacked bar where segment width reflects real pipeline volume —
 * numbering/order here means something, since applications genuinely
 * move through these stages in sequence.
 */
export default function PipelineStrip({ counts }) {
  const total = Math.max(
    STAGES.reduce((sum, s) => sum + (counts[s.key] || 0), 0),
    1
  )

  return (
    <div className="mb-8">
      <div className="flex h-2 rounded-full overflow-hidden bg-line">
        {STAGES.map((s) => {
          const value = counts[s.key] || 0
          const widthPct = (value / total) * 100
          return widthPct > 0 ? (
            <div
              key={s.key}
              className={s.color}
              style={{ width: `${widthPct}%` }}
              title={`${s.label}: ${value}`}
            />
          ) : null
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {STAGES.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 font-mono text-xs text-slate">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            <span>0{i + 1}</span>
            <span className="text-ink">{s.label}</span>
            <span>{counts[s.key] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
