'use client'
import { useEffect, useState } from 'react'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: 'subscriber' | 'admin'
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('gg_token')
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('gg_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setAuth(token: string, user: AuthUser): void {
  localStorage.setItem('gg_token', token)
  localStorage.setItem('gg_user', JSON.stringify(user))
}

export function clearAuth(): void {
  localStorage.removeItem('gg_token')
  localStorage.removeItem('gg_user')
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 🔥 FIX: delay so localStorage properly read
    setTimeout(() => {
      const token = getToken()
      const savedUser = getUser()

      if (token && savedUser) {
        setUser(savedUser)
      } else {
        setUser(null)
      }

      setLoading(false)
    }, 100) // 👈 IMPORTANT delay
  }, [])

  return { user, loading }
}