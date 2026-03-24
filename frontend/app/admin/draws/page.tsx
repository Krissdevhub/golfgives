'use client'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Play, Send, Zap, Shuffle } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import api from '@/lib/api'
import { formatCurrency, formatMonth, cn } from '@/lib/utils'

type DrawType = 'random' | 'algorithmic'

interface SimResult {
  drawn_numbers: number[]
  prize_pools: { match_5: number; match_4: number; match_3: number }
  jackpot_carryover: number
  winner_preview: { total: number; match_5: number; match_4: number; match_3: number }
}

export default function AdminDrawsPage() {
  const [drawType, setDrawType]   = useState<DrawType>('random')
  const [drawMonth, setDrawMonth] = useState(new Date().toISOString().slice(0, 7))
  const [simResult, setSimResult] = useState<SimResult | null>(null)

  const { data: publishedDraws } = useQuery({
    queryKey: ['published-draws'],
    queryFn: async () => {
      const res = await api.get('/api/draws')
      return res.data.data
    },
  })

  const simulateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/draws/simulate', { draw_type: drawType, draw_month: drawMonth })
      return res.data.data as SimResult
    },
    onSuccess: (data) => { setSimResult(data); toast.success('Simulation complete — review before publishing') },
    onError: () => toast.error('Simulation failed'),
  })

  const publishMutation = useMutation({
    mutationFn: async () => api.post('/api/draws/publish', { draw_type: drawType, draw_month: drawMonth }),
    onSuccess: () => { setSimResult(null); toast.success(`Draw for ${formatMonth(drawMonth)} published!`) },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Publish failed'
      toast.error(msg)
    },
  })

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="font-display font-extrabold text-3xl tracking-tight">Draw Engine</h1>
            <p className="text-white/50 text-sm mt-1">Configure, simulate, and publish monthly draws</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Draw config */}
            <div className="card p-6">
              <h2 className="font-display font-bold text-base mb-5">Draw Configuration</h2>

              {/* Month picker */}
              <div className="mb-5">
                <label className="block text-xs font-display font-semibold text-white/40 uppercase tracking-widest mb-2">Draw Month</label>
                <input type="month" value={drawMonth} onChange={e => setDrawMonth(e.target.value)} className="input" />
              </div>

              {/* Draw type */}
              <div className="mb-6">
                <label className="block text-xs font-display font-semibold text-white/40 uppercase tracking-widest mb-3">Draw Logic</label>
                <div className="space-y-2">
                  {([
                    { id: 'random' as DrawType,      icon: Shuffle, label: 'Random Draw',       desc: 'Standard lottery-style number generation' },
                    { id: 'algorithmic' as DrawType, icon: Zap,     label: 'Algorithmic Draw',  desc: 'Weighted by most/least frequent user scores' },
                  ]).map(opt => (
                    <button key={opt.id} type="button" onClick={() => setDrawType(opt.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all',
                        drawType === opt.id ? 'border-accent bg-accent/5' : 'border-border hover:border-border-strong'
                      )}>
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                        drawType === opt.id ? 'bg-accent/20' : 'bg-bg-tertiary'
                      )}>
                        <opt.icon size={17} className={drawType === opt.id ? 'text-accent' : 'text-white/40'} />
                      </div>
                      <div>
                        <div className="font-display font-bold text-sm">{opt.label}</div>
                        <div className="text-xs text-white/40 mt-0.5">{opt.desc}</div>
                      </div>
                      <div className={cn('w-4 h-4 rounded-full border-2 ml-auto flex-shrink-0 transition-all',
                        drawType === opt.id ? 'border-accent bg-accent' : 'border-white/20'
                      )} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => simulateMutation.mutate()}
                  disabled={simulateMutation.isPending}
                  className="btn-ghost flex-1 flex items-center justify-center gap-2 py-3">
                  <Play size={16} />
                  {simulateMutation.isPending ? 'Simulating...' : 'Simulate'}
                </button>
                <button onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending || !simResult}
                  className="btn-gold flex-1 flex items-center justify-center gap-2 py-3">
                  <Send size={16} />
                  {publishMutation.isPending ? 'Publishing...' : 'Publish Draw'}
                </button>
              </div>
              {!simResult && <p className="text-xs text-white/30 text-center mt-2">Simulate first to preview results before publishing</p>}
            </div>

            {/* Pool breakdown */}
            <div className="card p-6">
              <h2 className="font-display font-bold text-base mb-5">Pool Distribution</h2>
              <div className="space-y-3 mb-6">
                {[
                  { label: '5-Number Match', note: 'Jackpot — rolls over if unclaimed', pct: '40%', color: 'text-gold',       bar: 'bg-gold',       w: 'w-2/5' },
                  { label: '4-Number Match', note: 'Split equally among winners',       pct: '35%', color: 'text-accent',     bar: 'bg-accent',     w: 'w-[35%]' },
                  { label: '3-Number Match', note: 'Split equally among winners',       pct: '25%', color: 'text-indigo-400', bar: 'bg-indigo-500', w: 'w-1/4' },
                ].map(p => (
                  <div key={p.label} className="bg-bg-tertiary rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-display font-bold text-sm">{p.label}</div>
                        <div className="text-xs text-white/30 mt-0.5">{p.note}</div>
                      </div>
                      <div className={`font-display font-extrabold text-xl ${p.color}`}>{p.pct}</div>
                    </div>
                    <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
                      <div className={`h-full ${p.bar} ${p.w} rounded-full`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Simulation result */}
              {simResult && (
                <div className="border border-gold/30 bg-gold/5 rounded-xl p-4 animate-fade-in">
                  <p className="text-xs font-display font-semibold text-gold uppercase tracking-widest mb-3">Simulation Result</p>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {simResult.drawn_numbers.map((n, i) => (
                      <div key={i} className="w-10 h-10 rounded-lg bg-gold text-black flex items-center justify-center font-display font-extrabold">
                        {n}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/50">5-Match winners</span>
                      <span className="font-display font-bold text-gold">{simResult.winner_preview.match_5} — {formatCurrency(simResult.prize_pools.match_5)} each</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">4-Match winners</span>
                      <span className="font-display font-bold text-accent">{simResult.winner_preview.match_4} — {formatCurrency(simResult.prize_pools.match_4)} each</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">3-Match winners</span>
                      <span className="font-display font-bold text-indigo-400">{simResult.winner_preview.match_3} — {formatCurrency(simResult.prize_pools.match_3)} each</span>
                    </div>
                    {simResult.winner_preview.match_5 === 0 && (
                      <div className="text-xs text-gold/70 mt-2 font-display font-semibold">⚡ No jackpot winner — pool will roll over</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Published draws history */}
          <div className="card p-6">
            <h2 className="font-display font-bold text-base mb-5">Published Draws</h2>
            {!publishedDraws?.length ? (
              <p className="text-white/30 text-sm py-4 text-center">No draws published yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {['Month', 'Type', 'Drawn Numbers', '5-Match Pool', '4-Match Pool', '3-Match Pool', 'Jackpot Rolled'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-display font-semibold text-white/40 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {publishedDraws.map((d: { id: string; draw_month: string; draw_type: string; drawn_numbers: number[]; prize_pool_5: number; prize_pool_4: number; prize_pool_3: number; jackpot_rolled: boolean }) => (
                      <tr key={d.id} className="border-b border-border/50 hover:bg-bg-secondary/50">
                        <td className="px-4 py-3 font-display font-semibold text-sm">{formatMonth(d.draw_month)}</td>
                        <td className="px-4 py-3">
                          <span className="badge-muted capitalize">{d.draw_type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {d.drawn_numbers.map((n: number, i: number) => (
                              <span key={i} className="w-7 h-7 rounded-md bg-bg-elevated flex items-center justify-center font-display font-bold text-xs">{n}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-display font-semibold text-gold">{formatCurrency(d.prize_pool_5)}</td>
                        <td className="px-4 py-3 text-sm font-display font-semibold text-accent">{formatCurrency(d.prize_pool_4)}</td>
                        <td className="px-4 py-3 text-sm font-display font-semibold text-indigo-400">{formatCurrency(d.prize_pool_3)}</td>
                        <td className="px-4 py-3">
                          {d.jackpot_rolled ? <span className="badge-gold">Rolled Over</span> : <span className="badge-green">Won</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
