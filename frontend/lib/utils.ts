import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function getMatchLabel(matchType: string): string {
  const map: Record<string, string> = {
    '5_match': '5-Number Match (Jackpot)',
    '4_match': '4-Number Match',
    '3_match': '3-Number Match',
  }
  return map[matchType] ?? matchType
}

export function getProofStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    awaiting:       { label: 'Awaiting Proof',  className: 'badge-muted' },
    pending_review: { label: 'Under Review',    className: 'badge-gold'  },
    approved:       { label: 'Approved',         className: 'badge-green' },
    rejected:       { label: 'Rejected',         className: 'badge-red'  },
  }
  return map[status] ?? { label: status, className: 'badge-muted' }
}

export function getPaymentStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'Payment Pending', className: 'badge-gold'  },
    paid:    { label: 'Paid',            className: 'badge-green' },
    failed:  { label: 'Failed',          className: 'badge-red'  },
  }
  return map[status] ?? { label: status, className: 'badge-muted' }
}
