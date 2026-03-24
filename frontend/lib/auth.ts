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
    return raw ? (JSON.parse(raw) as AuthUser) : null
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

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin'
}
