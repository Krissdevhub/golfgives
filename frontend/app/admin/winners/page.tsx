'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Eye } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import api from '@/lib/api'
import { formatCurrency, formatMonth, getMatchLabel, getProofStatusBadge, getPaymentStatusBadge, cn } from '@/lib/utils'
import type { WinnerPayout } from '@/types'

export default function AdminWinnersPage() {
  const qc = useQueryClient()
  const [notes, setNotes] = useState<Record<string, string>>({})

  const { data: winners, isLoading } = useQuery<WinnerPayout[]>({
    queryKey: ['admin-winners'],
    queryFn: async () => {
      const res = await api.get('/api/admin/winners')
      return res.data.data
    },
  })

  const verifyMutation = useMutation({
    mutationFn: async ({ id, proof_status, admin_notes }: { id: string; proof_status: 'approved' | 'rejected'; admin_notes?: string }) =>
      api.patch(`/api/admin/winners/${id}/verify`, { proof_status, admin_notes }),
    onSuccess: (_, vars) => {
      toast.success(vars.proof_status === 'approved' ? 'Winner approved & marked paid ✓' : 'Submission rejected')
      qc.invalidateQueries({ queryKey: ['admin-winners'] })
    },
    onError: () => toast.error('Action failed'),
  })

  const pendingCount  = (winners ?? []).filter(w => w.proof_status === 'pending_review').length
  const approvedCount = (winners ?? []).filter(w => w.proof_status === 'approved').length
  const totalPaid     = (winners ?? []).filter(w => w.payment_status === 'paid').reduce((s, w) => s + Number(w.gross_amount), 0)

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="font-display font-extrabold text-3xl tracking-tight">Winners & Payouts</h1>
            <p className="text-white/50 text-sm mt-1">Verify proof submissions and track payments</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Pending Review',  value: pendingCount,              color: 'text-gold'   },
              { label: 'Approved & Paid', value: approvedCount,             color: 'text-accent' },
              { label: 'Total Paid Out',  value: formatCurrency(totalPaid), color: 'text-indigo-400' },
            ].map(s => (
              <div key={s.label} className="card p-5">
                <div className="text-xs font-display font-semibold text-white/40 uppercase tracking-widest mb-1">{s.label}</div>
                <div className={`font-display font-extrabold text-2xl ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Member', 'Draw Month', 'Match', 'Prize', 'Proof', 'Payment', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-display font-semibold text-white/40 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={7} className="text-center py-10 text-white/30">Loading...</td></tr>
                  ) : !winners?.length ? (
                    <tr><td colSpan={7} className="text-center py-10 text-white/30">No winners yet</td></tr>
                  ) : winners.map(w => {
                    const proofBadge   = getProofStatusBadge(w.proof_status)
                    const paymentBadge = getPaymentStatusBadge(w.payment_status)
                    const isPending    = w.proof_status === 'pending_review'
                    return (
                      <tr key={w.id} className="border-b border-border/50 hover:bg-bg-secondary/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-display font-semibold text-sm">{w.user?.full_name ?? '—'}</div>
                          <div className="text-xs text-white/40">{w.user?.email}</div>
                        </td>
                        <td className="px-5 py-4 text-sm text-white/60">
                          {w.draw ? formatMonth(w.draw.draw_month) : '—'}
                        </td>
                        <td className="px-5 py-4 text-sm font-display font-semibold">
                          {getMatchLabel(w.match_type)}
                        </td>
                        <td className="px-5 py-4 font-display font-bold text-accent">
                          {formatCurrency(w.gross_amount)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className={proofBadge.className}>{proofBadge.label}</span>
                            {w.proof_url && (
                              <a href={w.proof_url} target="_blank" rel="noreferrer"
                                className="text-white/30 hover:text-white transition-colors">
                                <Eye size={13} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={paymentBadge.className}>{paymentBadge.label}</span>
                        </td>
                        <td className="px-5 py-4">
                          {isPending ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => verifyMutation.mutate({ id: w.id, proof_status: 'approved', admin_notes: notes[w.id] })}
                                className="flex items-center gap-1 text-xs font-display font-semibold px-2.5 py-1.5 rounded-lg border border-accent/30 text-accent hover:bg-accent/10 transition-all">
                                <CheckCircle size={12} /> Approve
                              </button>
                              <button
                                onClick={() => verifyMutation.mutate({ id: w.id, proof_status: 'rejected', admin_notes: notes[w.id] })}
                                className="flex items-center gap-1 text-xs font-display font-semibold px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
                                <XCircle size={12} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-white/20">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
