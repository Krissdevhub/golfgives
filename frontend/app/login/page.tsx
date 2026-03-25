'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import api from '@/lib/api'

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await api.post('/api/auth/login', data)
      const { token, user } = res.data
      console.log("FULL RESPONSE:", res.data)

      // 🔥 FIX: force सही save
      localStorage.setItem("gg_token", token)
      localStorage.setItem("gg_user", JSON.stringify(user))

      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`)

      // 🔥 FIX: hard redirect (no loop)
      window.location.href = user.role === 'admin' ? '/admin' : '/dashboard'

    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Login failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display font-extrabold text-2xl tracking-tight block text-center mb-10">
          Golf<span className="text-accent">Gives</span>
        </Link>

        <div className="card p-8">
          <h1 className="font-display font-extrabold text-2xl tracking-tight mb-1">Welcome back</h1>
          <p className="text-white/50 text-sm mb-8">Sign in to your GolfGives account</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-display font-semibold text-white/50 uppercase tracking-widest mb-2">Email</label>
              <input {...register('email')} type="email" placeholder="you@example.com" className="input" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-display font-semibold text-white/50 uppercase tracking-widest mb-2">Password</label>
              <input {...register('password')} type="password" placeholder="••••••••" className="input" />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-accent hover:underline font-semibold">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}