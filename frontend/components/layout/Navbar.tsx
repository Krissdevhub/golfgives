'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react' // 🔥 added
import { Menu, X } from 'lucide-react'
import { clearAuth, getUser } from '@/lib/auth'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  const [mounted, setMounted] = useState(false) // 🔥 added
  const [user, setUser] = useState<any>(null)   // 🔥 changed

  const [open, setOpen] = useState(false)

  // 🔥 FIX: run only on client
  useEffect(() => {
    setMounted(true)
    setUser(getUser())
  }, [])

  function handleLogout() {
    clearAuth()
    router.push('/')
  }

  // 🔥 prevent hydration mismatch
  if (!mounted) return null

  const links = user
    ? user.role === 'admin'
      ? [{ href: '/admin', label: 'Dashboard' }, { href: '/admin/users', label: 'Users' }, { href: '/admin/draws', label: 'Draws' }]
      : [{ href: '/dashboard', label: 'My Dashboard' }]
    : [{ href: '/#how-it-works', label: 'How It Works' }, { href: '/#charities', label: 'Charities' }]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-bg-primary/80 backdrop-blur-xl border-b border-border flex items-center px-6">
      <Link href="/" className="font-display font-extrabold text-xl tracking-tight mr-8">
        Golf<span className="text-accent">Gives</span>
      </Link>

      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-1 flex-1">
        {links.map(l => (
          <Link key={l.href} href={l.href}
            className={cn(
              'text-sm px-4 py-2 rounded-lg transition-colors duration-200',
              pathname === l.href ? 'bg-bg-tertiary text-white' : 'text-white/50 hover:text-white hover:bg-bg-secondary'
            )}>
            {l.label}
          </Link>
        ))}
      </div>

      <div className="hidden md:flex items-center gap-3 ml-auto">
        {user ? (
          <>
            <span className="text-sm text-white/50 font-display">{user.full_name.split(' ')[0]}</span>
            <button onClick={handleLogout} className="btn-ghost text-sm py-2 px-4">Sign Out</button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn-ghost text-sm py-2 px-4">Sign In</Link>
            <Link href="/signup" className="btn-primary text-sm py-2 px-5">Get Started</Link>
          </>
        )}
      </div>

      {/* Mobile toggle */}
      <button className="md:hidden ml-auto text-white/60 hover:text-white" onClick={() => setOpen(!open)}>
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-bg-secondary border-b border-border p-4 flex flex-col gap-2">
          {links.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="text-sm px-4 py-2.5 rounded-lg hover:bg-bg-tertiary transition-colors">
              {l.label}
            </Link>
          ))}
          {user ? (
            <button onClick={handleLogout} className="text-left text-sm text-red-400 px-4 py-2.5">Sign Out</button>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)} className="text-sm px-4 py-2.5 hover:bg-bg-tertiary rounded-lg">Sign In</Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="btn-primary text-sm text-center">Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}