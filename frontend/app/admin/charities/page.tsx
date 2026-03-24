'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Star, StarOff, ToggleLeft, ToggleRight } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import api from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'
import type { Charity } from '@/types'

const charitySchema = z.object({
  name:        z.string().min(2, 'Name required'),
  description: z.string().optional(),
  category:    z.string().optional(),
  website_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  is_featured: z.boolean().default(false),
})
type CharityForm = z.infer<typeof charitySchema>

export default function AdminCharitiesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: charities, isLoading } = useQuery<Charity[]>({
    queryKey: ['admin-charities'],
    queryFn: async () => {
      const res = await api.get('/api/admin/charities')
      return res.data.data
    },
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CharityForm>({
    resolver: zodResolver(charitySchema),
    defaultValues: { is_featured: false },
  })

  const createMutation = useMutation({
    mutationFn: async (data: CharityForm) => api.post('/api/admin/charities', data),
    onSuccess: () => {
      toast.success('Charity added!')
      reset()
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['admin-charities'] })
    },
    onError: () => toast.error('Failed to add charity'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Charity> & { id: string }) =>
      api.patch(`/api/admin/charities/${id}`, data),
    onSuccess: () => {
      toast.success('Updated')
      qc.invalidateQueries({ queryKey: ['admin-charities'] })
    },
  })

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display font-extrabold text-3xl tracking-tight">Charity Directory</h1>
              <p className="text-white/50 text-sm mt-1">Manage listed charities and their content</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 py-2.5 px-5">
              <Plus size={16} />
              Add Charity
            </button>
          </div>

          {/* Add form */}
          {showForm && (
            <div className="card p-6 mb-6 animate-fade-in">
              <h2 className="font-display font-bold text-base mb-5">Add New Charity</h2>
              <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-display font-semibold text-white/40 uppercase tracking-widest mb-2">Name *</label>
                  <input {...register('name')} className="input" placeholder="Charity name" />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-display font-semibold text-white/40 uppercase tracking-widest mb-2">Category</label>
                  <input {...register('category')} className="input" placeholder="e.g. Health, Youth Sport" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-display font-semibold text-white/40 uppercase tracking-widest mb-2">Description</label>
                  <textarea {...register('description')} className="input resize-none h-20" placeholder="Brief description..." />
                </div>
                <div>
                  <label className="block text-xs font-display font-semibold text-white/40 uppercase tracking-widest mb-2">Website URL</label>
                  <input {...register('website_url')} className="input" placeholder="https://..." />
                  {errors.website_url && <p className="text-red-400 text-xs mt-1">{errors.website_url.message}</p>}
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" {...register('is_featured')} id="featured" className="accent-accent w-4 h-4" />
                  <label htmlFor="featured" className="text-sm font-display font-semibold cursor-pointer">Feature on homepage</label>
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" disabled={createMutation.isPending} className="btn-primary px-6 py-2.5">
                    {createMutation.isPending ? 'Adding...' : 'Add Charity'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); reset() }} className="btn-ghost px-6 py-2.5">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Charities table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Charity', 'Category', 'Total Donated', 'Featured', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-display font-semibold text-white/40 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={6} className="text-center py-10 text-white/30">Loading...</td></tr>
                  ) : !charities?.length ? (
                    <tr><td colSpan={6} className="text-center py-10 text-white/30">No charities yet</td></tr>
                  ) : charities.map((c: Charity) => ( // Explicitly cast 'c' to 'Charity' here
                    <tr key={c.id} className="border-b border-border/50 hover:bg-bg-secondary/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-display font-bold text-sm">{c.name}</div>
                        {c.description && <div className="text-xs text-white/30 mt-0.5 truncate max-w-xs">{c.description}</div>}
                      </td>
                      <td className="px-5 py-4 text-sm text-white/50">{c.category ?? '—'}</td>
                      <td className="px-5 py-4 font-display font-bold text-accent text-sm">{formatCurrency(c.total_donated)}</td>
                      <td className="px-5 py-4">
                        <button onClick={() => updateMutation.mutate({ id: c.id, is_featured: !c.is_featured })}
                          className="text-white/30 hover:text-gold transition-colors">
                          {c.is_featured ? <Star size={16} className="text-gold fill-gold" /> : <StarOff size={16} />}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        {/* Using a very safe check to satisfy the production compiler */}
                        <span className={cn(c.is_active ? 'badge-green' : 'badge-red')}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => updateMutation.mutate({ id: c.id, is_active: !c.is_active })}
                          className="text-white/30 hover:text-white transition-colors">
                          {c.is_active ? <ToggleRight size={18} className="text-accent" /> : <ToggleLeft size={18} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}