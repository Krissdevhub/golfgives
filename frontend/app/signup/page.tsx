'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import api from '@/lib/api'
import { setAuth } from '@/lib/auth'
import { cn, formatCurrency } from '@/lib/utils'
import type { Charity } from '@/types'

const schema = z.object({
  full_name:          z.string().min(2, 'Name must be at least 2 characters'),
  email:              z.string().email('Invalid email address'),
  password:           z.string().min(8, 'Min 8 chars').regex(/[A-Z]/, 'Include uppercase').regex(/[0-9]/, 'Include a number'),
  plan_type:          z.enum(['monthly', 'yearly']),
  charity_id:         z.string().uuid().optional().nullable(),
  charity_percentage: z.number().min(10).max(50),
})
type FormData = z.infer<typeof schema>

export default function SignupPage() {
  const router        = useRouter()
  const params        = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [step, setStep]       = useState<1 | 2>(1)
  const [step1Valid, setStep1Valid] = useState(false)

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      plan_type:          (params.get('plan') as 'yearly') ?? 'monthly',
      charity_percentage: 10,
    },
  })

  const selectedPlan = watch('plan_type')
  const charityPct   = watch('charity_percentage')
  const charityId    = watch('charity_id')

  const { data: charities } = useQuery<Charity[]>({
    queryKey: ['charities'],
    queryFn:  async () => (await api.get('/api/charities')).data.data,
  })

  async function goToStep2() {
    const ok = await trigger(['full_name', 'email', 'password'])
    if (!ok) return
    setStep1Valid(true)
    setStep(2)
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      // Step 1: Register user
      const regRes = await api.post('/api/auth/register', {
        email:     data.email,
        password:  data.password,
        full_name: data.full_name,
      })
      const { token, user } = regRes.data.data
      setAuth(token, user)

      // Step 2: Create subscription (demo mode — instantly active)
      await api.post('/api/subscriptions', {
        plan_type:          data.plan_type,
        charity_id:         data.charity_id ?? null,
        charity_percentage: data.charity_percentage,
      })

      toast.success('Welcome to GolfGives! 🎉 Account activated.')
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Signup failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const plans = [
    { id: 'monthly' as const, name: 'Monthly', price: '£9',  period: '/month', badge: null        },
    { id: 'yearly'  as const, name: 'Yearly',  price: '£90', period: '/year',  badge: 'Save 17%'  },
  ]

  const monthlyAmount = selectedPlan === 'monthly' ? 9 : 7.5
  const donation      = formatCurrency((monthlyAmount * charityPct) / 100)

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-lg">
        <Link href="/" className="font-display font-extrabold text-2xl tracking-tight block text-center mb-10">
          Golf<span className="text-accent">Gives</span>
        </Link>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[
            { n: 1, label: 'Account' },
            { n: 2, label: 'Your Plan' },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-3">
              {i > 0 && <div className="w-12 h-px bg-border" />}
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold transition-all duration-300',
                  step > s.n  ? 'bg-accent text-black' :
                  step === s.n ? 'bg-accent text-black' : 'bg-bg-tertiary text-white/30'
                )}>
                  {step > s.n ? <Check size={13} /> : s.n}
                </div>
                <span className={cn('text-sm font-display font-semibold',
                  step >= s.n ? 'text-white' : 'text-white/30'
                )}>{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)}>

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h1 className="font-display font-extrabold text-2xl tracking-tight mb-1">Create your account</h1>
                  <p className="text-white/50 text-sm mb-6">Join 847 golfers already giving back</p>
                </div>

                <div>
                  <label className="block text-xs font-display font-semibold text-white/40 uppercase tracking-widest mb-2">Full Name</label>
                  <input {...register('full_name')} placeholder="Your Name" className="input" />
                  {errors.full_name && <p className="text-red-400 text-xs mt-1">{errors.full_name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-display font-semibold text-white/40 uppercase tracking-widest mb-2">Email</label>
                  <input {...register('email')} type="email" placeholder="you@example.com" className="input" />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-display font-semibold text-white/40 uppercase tracking-widest mb-2">Password</label>
                  <input {...register('password')} type="password" placeholder="Min 8 chars · 1 uppercase · 1 number" className="input" />
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <button type="button" onClick={goToStep2} className="btn-primary w-full py-3.5 text-base">
                  Continue →
                </button>

                <p className="text-center text-sm text-white/40 pt-1">
                  Already a member?{' '}
                  <Link href="/login" className="text-accent hover:underline font-semibold">Sign In</Link>
                </p>
              </div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="font-display font-extrabold text-2xl tracking-tight mb-1">Choose your plan</h2>
                  <p className="text-white/50 text-sm mb-6">Cancel anytime · No lock-in · Demo mode active</p>
                </div>

                {/* Plan cards */}
                <div className="grid grid-cols-2 gap-3">
                  {plans.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => setValue('plan_type', p.id)}
                      className={cn(
                        'relative border rounded-[14px] p-5 text-left transition-all duration-200',
                        selectedPlan === p.id
                          ? 'border-accent bg-accent/5 shadow-[0_0_0_1px_rgba(74,222,128,0.3)]'
                          : 'border-border hover:border-border-strong'
                      )}>
                      {p.badge && (
                        <span className="absolute -top-2.5 right-3 bg-gold text-black text-[10px] font-display font-bold px-2 py-0.5 rounded-pill">
                          {p.badge}
                        </span>
                      )}
                      <div className="font-display font-bold text-sm mb-2">{p.name}</div>
                      <div className="font-display font-extrabold text-2xl text-accent">
                        {p.price}<span className="text-sm text-white/40 font-normal">{p.period}</span>
                      </div>
                      {selectedPlan === p.id && (
                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                          <Check size={10} className="text-black" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Charity picker */}
                <div>
                  <label className="block text-xs font-display font-semibold text-white/40 uppercase tracking-widest mb-3">
                    Choose Your Charity <span className="text-white/20 normal-case font-normal">(optional)</span>
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {(charities ?? []).map(c => (
                      <button key={c.id} type="button"
                        onClick={() => setValue('charity_id', charityId === c.id ? null : c.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                          charityId === c.id
                            ? 'border-accent bg-accent/5'
                            : 'border-border hover:border-border-strong'
                        )}>
                        <div className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                          charityId === c.id ? 'border-accent bg-accent' : 'border-white/20'
                        )}>
                          {charityId === c.id && <Check size={10} className="text-black" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-display font-bold text-sm truncate">{c.name}</div>
                          <div className="text-xs text-white/40">{c.category}</div>
                        </div>
                        {c.is_featured && <span className="badge-gold text-[10px] py-0.5 flex-shrink-0">Featured</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Charity % slider */}
                {charityId && (
                  <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-display font-semibold text-white/40 uppercase tracking-widest">
                        Charity Contribution
                      </label>
                      <span className="font-display font-extrabold text-accent text-lg">{charityPct}%</span>
                    </div>
                    <input type="range" min={10} max={50} step={1}
                      value={charityPct}
                      onChange={e => setValue('charity_percentage', Number(e.target.value))}
                      className="w-full accent-accent h-1 cursor-pointer" />
                    <div className="flex justify-between text-xs text-white/25 mt-1.5 mb-3">
                      <span>10% min</span><span>50% max</span>
                    </div>
                    <div className="bg-bg-tertiary rounded-xl p-3 flex items-center justify-between">
                      <span className="text-sm text-white/50">Monthly donation to charity</span>
                      <span className="font-display font-bold text-accent">{donation}</span>
                    </div>
                  </div>
                )}

                {/* Demo notice */}
                <div className="flex items-start gap-3 bg-gold/5 border border-gold/20 rounded-xl p-4">
                  <span className="text-gold text-lg flex-shrink-0">⚡</span>
                  <div>
                    <p className="text-xs font-display font-bold text-gold mb-0.5">Demo Mode Active</p>
                    <p className="text-xs text-white/40 leading-relaxed">
                      No payment required. Your subscription activates instantly so you can explore the full platform.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1 py-3">
                    ← Back
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 text-base">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Activating...
                      </span>
                    ) : 'Activate Account →'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}