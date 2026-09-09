import { MessageSquare } from 'lucide-react'

/**
 * Bento-grid stats layout adapted from a 21st.dev component — ported onto
 * this app's own design tokens (ink/paper/signal/slate) instead of shadcn's
 * CSS-variable theme, and wired to real data instead of placeholder copy.
 */
export default function StatsBento({ appliedCount, weeklyTrend, offersCount, interviewCount }) {
  const maxTrend = Math.max(...weeklyTrend, 1)
  const trendTotal = weeklyTrend.reduce((a, b) => a + b, 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 md:grid-rows-2 gap-4">
      {/* Primary stat */}
      <div className="md:col-span-3 md:row-span-2 bg-ink rounded-3xl p-10 flex flex-col justify-between overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 1px, transparent 1px, transparent 10px)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 100% 0%, #000 70%, transparent 110%)',
            maskImage: 'radial-gradient(ellipse 80% 50% at 100% 0%, #000 70%, transparent 110%)',
          }}
        />
        <div className="relative">
          <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-6">
            Applications
          </span>
          <h3 className="text-6xl tracking-tighter text-white font-mono">{appliedCount}</h3>
        </div>
        <p className="relative text-white/60 text-sm max-w-xs">
          Total applications submitted since you started tracking your job search here.
        </p>
      </div>

      {/* Real 4-week trend, not decorative bars */}
      <div className="md:col-span-3 bg-white rounded-3xl p-8 border border-line flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate mb-1">Last 4 weeks</p>
          <p className="text-3xl text-ink font-mono">{trendTotal}</p>
        </div>
        <div className="flex gap-1.5 items-end h-10">
          {weeklyTrend.map((h, i) => (
            <div
              key={i}
              className={`w-3 rounded-full ${h > 0 ? 'bg-signal' : 'bg-line'}`}
              style={{ height: `${Math.max((h / maxTrend) * 100, 10)}%` }}
              title={`${h} applied`}
            />
          ))}
        </div>
      </div>

      {/* Offers */}
      <div className="md:col-span-1 bg-white rounded-3xl p-6 border border-line flex flex-col justify-center text-center">
        <p className="text-2xl text-ink font-mono">{offersCount}</p>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate">Offers</p>
      </div>

      {/* Interviews */}
      <div className="md:col-span-2 bg-paper rounded-3xl p-6 flex items-center gap-4 border border-line">
        <div className="size-10 rounded-full bg-white text-signal flex items-center justify-center shrink-0 shadow-sm">
          <MessageSquare size={18} />
        </div>
        <div>
          <p className="text-sm text-ink leading-none font-mono">{interviewCount} in progress</p>
          <p className="text-xs font-semibold text-slate mt-1">Interview stage</p>
        </div>
      </div>
    </div>
  )
}
