'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trophy, Heart, BarChart2, Plus, Trash2, TrendingUp } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import api from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatCurrency, formatDate, formatMonth, getMatchLabel, getPaymentStatusBadge, cn } from '@/lib/utils'
import type { DashboardData, WinnerPayout } from '@/types'

const scoreSchema = z.object({
  score:     z.number({ invalid_type_error: 'Enter a number' }).int().min(1).max(45),
  played_on: z.string().min(1, 'Date required'),
})
type ScoreForm = z.infer<typeof scoreSchema>

export default function DashboardPage() {
  const router = useRouter()
  const qc     = useQueryClient()
  const today  = new Date().toISOString().split('T')[0]

  // ✅ FIXED AUTH
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  // ✅ fetch only after auth ready
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/api/users/dashboard')
      return res.data.data
    },
    enabled: !loading && !!user,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ScoreForm>({
    resolver: zodResolver(scoreSchema),
    defaultValues: { played_on: today },
  })

  const addScoreMutation = useMutation({
    mutationFn: async (body: ScoreForm) => api.post('/api/scores', body),
    onSuccess: () => {
      toast.success('Score added!')
      reset({ played_on: today })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add score'
      toast.error(msg)
    },
  })

  const deleteScoreMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/api/scores/${id}`),
    onSuccess: () => {
      toast.success('Score removed')
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  // ✅ FIXED LOADING STATE (NO REDIRECT BUG)
  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-white/30 font-display text-sm">
          Loading dashboard...
        </div>
      </div>
    )
  }

  // 🔥 IMPORTANT: double safety
  if (!user) return null
  if (!data) return null

  const { subscription, scores, draw_entries, payouts, stats } = data
  const latestDraw  = draw_entries[0]
  const drawNumbers = scores.slice(0, 5).map(s => s.score)

  const now     = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const daysLeft = Math.ceil((lastDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-10">

          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="font-display font-extrabold text-3xl tracking-tight">
                Welcome back, {user.full_name.split(' ')[0]} 👋
              </h1>
              <p className="text-white/50 text-sm mt-1">
                {subscription
                  ? `${subscription.plan_type === 'monthly' ? 'Monthly' : 'Yearly'} Plan · Renews ${subscription.current_period_end ? formatDate(subscription.current_period_end) : '—'}`
                  : 'No active subscription'}
              </p>
            </div>
            {subscription?.status === 'active' && (
              <div className="badge-green">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Active
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Trophy,     label: 'Total Winnings',  value: formatCurrency(stats.total_won),                                                                                          color: 'text-gold'        },
              { icon: Heart,      label: 'Charity Donated', value: formatCurrency((subscription?.amount_pence ?? 0) / 100 * (subscription?.charity_percentage ?? 10) / 100 * 6),            color: 'text-pink-400'    },
              { icon: BarChart2,  label: 'Draws Entered',   value: String(stats.draws_entered),                                                                                              color: 'text-indigo-400'  },
              { icon: TrendingUp, label: 'Avg Score',       value: stats.avg_score + ' pts',                                                                                                 color: 'text-accent'      },
            ].map(s => (
              <div key={s.label} className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <s.icon size={15} className={cn('opacity-60', s.color)} />
                  <span className="text-xs text-white/40 font-display font-semibold uppercase tracking-widest">{s.label}</span>
                </div>
                <div className={cn('font-display font-extrabold text-2xl tracking-tight', s.color)}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* ── Scores panel ── */}
            <div className="lg:col-span-3 space-y-6">
              <div className="card p-6">
                <h2 className="font-display font-bold text-base mb-5">Your Scores (Last 5)</h2>
                <div className="space-y-2 mb-5">
                  {scores.length === 0 ? (
                    <p className="text-white/30 text-sm py-4 text-center">No scores yet. Add your first score below.</p>
                  ) : (
                    scores.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-3 bg-bg-tertiary rounded-lg px-4 py-3">
                        <span className="text-xs text-white/30 font-display font-bold w-5">{i + 1}</span>
                        <span className="text-sm text-white/50 flex-1">{formatDate(s.played_on)}</span>
                        <div className="flex-1 max-w-[80px] h-1 bg-bg-elevated rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${(s.score / 45) * 100}%` }} />
                        </div>
                        <span className="font-display font-extrabold text-lg w-8 text-right">{s.score}</span>
                        <button
                          onClick={() => deleteScoreMutation.mutate(s.id)}
                          className="text-white/20 hover:text-red-400 transition-colors ml-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSubmit(d => addScoreMutation.mutate(d))} className="flex gap-2">
                  <div className="flex-1">
                    <input
                      {...register('score', { valueAsNumber: true })}
                      type="number" placeholder="Score (1–45)" min={1} max={45}
                      className="input" />
                    {errors.score && <p className="text-red-400 text-xs mt-1">{errors.score.message}</p>}
                  </div>
                  <div className="w-38">
                    <input {...register('played_on')} type="date" className="input" />
                  </div>
                  <button type="submit" disabled={addScoreMutation.isPending}
                    className="btn-primary px-4 py-2.5 flex items-center gap-1.5 text-sm whitespace-nowrap">
                    <Plus size={15} />
                    Add
                  </button>
                </form>
                <p className="text-xs text-white/25 mt-2">Adding a 6th score automatically removes the oldest.</p>
              </div>

              {/* Winnings history */}
              <div className="card p-6">
                <h2 className="font-display font-bold text-base mb-5">Winnings History</h2>
                {payouts.length === 0 ? (
                  <p className="text-white/30 text-sm py-4 text-center">No winnings yet — keep playing!</p>
                ) : (
                  <div className="divide-y divide-border">
                    {payouts.map((p: WinnerPayout) => {
                      const badge = getPaymentStatusBadge(p.payment_status)
                      return (
                        <div key={p.id} className="flex items-center gap-3 py-3">
                          <div className="flex-1">
                            <div className="text-sm font-display font-semibold">{getMatchLabel(p.match_type)}</div>
                            <div className="text-xs text-white/40 mt-0.5">
                              {p.draw ? formatMonth(p.draw.draw_month) : '—'}
                            </div>
                          </div>
                          <div className="font-display font-extrabold text-accent">
                            {formatCurrency(p.gross_amount)}
                          </div>
                          <span className={badge.className}>{badge.label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right col ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Charity card */}
              <div className="card p-6">
                <h2 className="font-display font-bold text-base mb-4">Your Charity</h2>
                {subscription?.charity ? (
                  <>
                    <div className="flex items-center gap-3 bg-bg-tertiary rounded-lg p-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center text-xl">🌍</div>
                      <div>
                        <div className="font-display font-bold text-sm">{subscription.charity.name}</div>
                        <div className="text-xs text-white/40">{subscription.charity.category}</div>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/50">Monthly contribution</span>
                      <span className="font-display font-bold text-accent">{subscription.charity_percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-accent to-gold rounded-full transition-all"
                        style={{ width: `${subscription.charity_percentage}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-white/25 mt-1">
                      <span>10% min</span><span>50% max</span>
                    </div>
                  </>
                ) : (
                  <p className="text-white/30 text-sm">No charity selected.</p>
                )}
              </div>

              {/* Draw card */}
              <div className="card p-6">
                <h2 className="font-display font-bold text-base mb-4">This Month&apos;s Draw</h2>
                <div className="text-center mb-5">
                  <div className="font-display font-extrabold text-5xl text-gold tracking-tight">{daysLeft}</div>
                  <div className="text-xs text-white/40 mt-1">days until next draw</div>
                </div>
                <div className="mb-4">
                  <p className="text-xs text-white/40 text-center mb-3">Your draw numbers (from your scores)</p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {drawNumbers.length > 0 ? drawNumbers.map((n, i) => (
                      <div key={i} className="w-10 h-10 rounded-lg bg-bg-tertiary border border-border flex items-center justify-center font-display font-extrabold text-base">
                        {n}
                      </div>
                    )) : (
                      <p className="text-xs text-white/30">Enter scores to generate your numbers</p>
                    )}
                  </div>
                </div>
                {latestDraw?.draw?.status === 'published' && (
                  <div className="bg-bg-tertiary rounded-lg p-3 mt-3">
                    <p className="text-xs text-white/40 mb-2">Last draw — {formatMonth(latestDraw.draw.draw_month)}</p>
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {latestDraw.draw.drawn_numbers.map((n, i) => {
                        const matched = latestDraw.entry_numbers.includes(n)
                        return (
                          <div key={i} className={cn(
                            'w-8 h-8 rounded-md flex items-center justify-center font-display font-bold text-sm',
                            matched ? 'bg-accent/20 border border-accent/40 text-accent' : 'bg-bg-elevated text-white/50'
                          )}>
                            {n}
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-white/40">
                      You matched <span className="text-accent font-bold">{latestDraw.match_count}</span> numbers
                      {latestDraw.is_winner ? ' 🎉 You won!' : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Subscription status */}
              {subscription && (
                <div className="card p-5">
                  <h2 className="font-display font-bold text-sm mb-3">Subscription</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/40">Plan</span>
                      <span className="font-display font-semibold capitalize">{subscription.plan_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Amount</span>
                      <span className="font-display font-semibold">{formatCurrency(subscription.amount_pence / 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Status</span>
                      <span className={cn('font-display font-semibold', subscription.status === 'active' ? 'text-accent' : 'text-red-400')}>
                        {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}