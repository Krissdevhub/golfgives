'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Users, Trophy, Heart, AlertCircle, TrendingUp, ChevronRight } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import api from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'
import type { AdminStats } from '@/types'

// 🔥 ADDED
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminPage() {

  // 🔥 ADDED
  const router = useRouter();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!user || user.role !== "admin") {
      router.push("/login");
    }
  }, [router]);

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/api/admin/stats')
      return res.data.data
    },
  })

  const cards = stats ? [
    { icon: Users,       label: 'Total Subscribers',   value: stats.active_subscribers.toLocaleString(), sub: `${stats.total_users} total accounts`,          color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { icon: Trophy,      label: 'Monthly Prize Pool',  value: formatCurrency(stats.monthly_prize_pool),   sub: 'Active this draw cycle',                        color: 'text-gold',       bg: 'bg-gold/10'        },
    { icon: Heart,       label: 'Total Donated',       value: formatCurrency(stats.total_charity_donated),sub: 'All time charity contributions',                color: 'text-pink-400',   bg: 'bg-pink-500/10'    },
    { icon: AlertCircle, label: 'Pending Payouts',     value: String(stats.pending_payouts),              sub: 'Winners awaiting verification',                 color: 'text-red-400',    bg: 'bg-red-500/10'     },
  ] : []

  const navItems = [
    { href: '/admin/users',     label: 'User Management',      desc: 'View and manage all subscribers',        icon: Users   },
    { href: '/admin/draws',     label: 'Draw Engine',          desc: 'Configure, simulate, and publish draws', icon: Trophy  },
    { href: '/admin/charities', label: 'Charity Directory',    desc: 'Manage listed charities and content',    icon: Heart   },
    { href: '/admin/winners',   label: 'Winners & Payouts',    desc: 'Verify submissions and mark payments',   icon: TrendingUp },
  ]

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="font-display font-extrabold text-3xl tracking-tight">Admin Dashboard</h1>
            <p className="text-white/50 text-sm mt-1">GolfGives Platform Control Centre</p>
          </div>

          {isLoading ? (
            <div className="text-white/40 font-display">Loading stats...</div>
          ) : (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {cards.map(c => (
                  <div key={c.label} className="card p-5">
                    <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
                      <c.icon size={17} className={c.color} />
                    </div>
                    <div className="font-display font-extrabold text-2xl tracking-tight mb-0.5">{c.value}</div>
                    <div className="text-xs text-white/40 uppercase tracking-widest font-display font-semibold">{c.label}</div>
                    <div className="text-xs text-white/25 mt-1">{c.sub}</div>
                  </div>
                ))}
              </div>

              {/* Prize pool breakdown */}
              {stats && (
                <div className="card p-6 mb-8">
                  <h2 className="font-display font-bold text-base mb-5">Prize Pool Breakdown (This Month)</h2>
                  <div className="space-y-4">
                    {[
                      { label: '5-Number Jackpot', pct: 40, amount: stats.prize_pool_breakdown.match_5, color: 'bg-gold',       text: 'text-gold'       },
                      { label: '4-Number Match',   pct: 35, amount: stats.prize_pool_breakdown.match_4, color: 'bg-accent',     text: 'text-accent'     },
                      { label: '3-Number Match',   pct: 25, amount: stats.prize_pool_breakdown.match_3, color: 'bg-indigo-500', text: 'text-indigo-400' },
                    ].map(p => (
                      <div key={p.label} className="flex items-center gap-4">
                        <div className="w-36 text-sm font-display font-semibold">{p.label}</div>
                        <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                          <div className={`h-full ${p.color} rounded-full`} style={{ width: `${p.pct}%` }} />
                        </div>
                        <div className={`font-display font-bold text-sm w-20 text-right ${p.text}`}>
                          {formatCurrency(p.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick nav */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {navItems.map(n => (
                  <Link key={n.href} href={n.href}
                    className="card p-5 flex items-center gap-4 hover:border-border-strong transition-all hover:-translate-y-0.5 group">
                    <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center flex-shrink-0">
                      <n.icon size={18} className="text-white/60 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1">
                      <div className="font-display font-bold text-sm">{n.label}</div>
                      <div className="text-xs text-white/40 mt-0.5">{n.desc}</div>
                    </div>
                    <ChevronRight size={16} className="text-white/20 group-hover:text-white/60 transition-colors" />
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}