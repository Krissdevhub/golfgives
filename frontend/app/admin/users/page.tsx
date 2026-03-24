'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Search, UserX, UserCheck } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import api from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'

interface AdminUser {
  id: string; email: string; full_name: string; role: string; is_active: boolean
  created_at: string; subscriptions?: { status: string; plan_type: string }[]
}

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: async () => {
      const res = await api.get(`/api/admin/users?search=${search}`)
      return res.data.data
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/api/admin/users/${id}`, { is_active }),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: ['admin-users'] }) },
    onError: () => toast.error('Update failed'),
  })

  const users: AdminUser[] = data?.users ?? []

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display font-extrabold text-3xl tracking-tight">User Management</h1>
              <p className="text-white/50 text-sm mt-1">{data?.pagination?.total ?? 0} total subscribers</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="input pl-10" />
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Name', 'Email', 'Plan', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-display font-semibold text-white/40 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={6} className="text-center py-10 text-white/30">Loading...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-white/30">No users found</td></tr>
                  ) : users.map((u: AdminUser) => {
                    const sub = u.subscriptions?.[0]
                    return (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-bg-secondary/50 transition-colors">
                        <td className="px-5 py-4 font-display font-semibold text-sm">{u.full_name}</td>
                        <td className="px-5 py-4 text-sm text-white/60">{u.email}</td>
                        <td className="px-5 py-4">
                          {sub ? (
                            <span className={cn('text-xs font-display font-semibold px-2 py-1 rounded-md',
                              sub.status === 'active' ? 'bg-accent/10 text-accent' : 'bg-white/5 text-white/40'
                            )}>
                              {sub.plan_type}
                            </span>
                          ) : <span className="text-xs text-white/30">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn('badge-' + (u.is_active ? 'green' : 'red'))}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-white/40">{formatDate(u.created_at)}</td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => toggleActiveMutation.mutate({ id: u.id, is_active: !u.is_active })}
                            className={cn('flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5 rounded-lg border transition-all',
                              u.is_active
                                ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                : 'border-accent/30 text-accent hover:bg-accent/10'
                            )}>
                            {u.is_active ? <><UserX size={12} /> Deactivate</> : <><UserCheck size={12} /> Activate</>}
                          </button>
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
