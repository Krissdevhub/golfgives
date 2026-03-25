'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import axios from 'axios' // 🔥 api hata diya direct axios use

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)

    try {
      const res = await axios.post(
        'http://localhost:4000/api/auth/login', // 🔥 apna backend URL dal
        data,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )

      console.log("FULL RESPONSE:", res.data)

      // 🔥 SAFE EXTRACTION (har case cover)
      const token = res.data?.token || res.data?.data?.token
      const user = res.data?.user || res.data?.data?.user

      if (!token) {
        toast.error("Token nahi mila backend se ❌")
        console.log("ERROR RESPONSE:", res.data)
        return
      }

      // 🔥 FORCE SAVE
      localStorage.setItem('gg_token', token)
      localStorage.setItem('gg_user', JSON.stringify(user))

      console.log("SAVED TOKEN:", localStorage.getItem('gg_token'))

      toast.success(`Welcome ${user?.full_name || 'User'} 🎉`)

      // 🔥 delay so storage pakka ho jaye
      setTimeout(() => {
        window.location.href =
          user?.role === 'admin' ? '/admin' : '/dashboard'
      }, 300)

    } catch (err: any) {
      console.log("LOGIN ERROR:", err?.response?.data || err)
      toast.error(err?.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-80">
        <input {...register('email')} placeholder="Email" />
        <input {...register('password')} type="password" placeholder="Password" />

        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Login'}
        </button>

        {errors.email && <p>{errors.email.message}</p>}
        {errors.password && <p>{errors.password.message}</p>}
      </form>
    </div>
  )
}