export type UserRole = 'subscriber' | 'admin'
export type SubscriptionStatus = 'active' | 'cancelled' | 'lapsed' | 'pending'
export type PlanType = 'monthly' | 'yearly'
export type DrawType = 'random' | 'algorithmic'
export type MatchType = '5_match' | '4_match' | '3_match'
export type ProofStatus = 'awaiting' | 'pending_review' | 'approved' | 'rejected'
export type PaymentStatus = 'pending' | 'paid' | 'failed'

export interface User {
  id: string; email: string; full_name: string; role: UserRole; is_active: boolean; created_at: string
}
export interface Charity {
  id: string; name: string; description: string | null; category: string | null
  image_url: string | null; website_url: string | null; is_featured: boolean; total_donated: number; is_active: boolean;
}
export interface Subscription {
  id: string; user_id: string; plan_type: PlanType; status: SubscriptionStatus
  charity_percentage: number; amount_pence: number; current_period_end: string | null; charity?: Charity
}
export interface GolfScore {
  id: string; user_id: string; score: number; played_on: string; created_at: string
}
export interface Draw {
  id: string; draw_month: string; draw_type: DrawType; drawn_numbers: number[]
  status: string; prize_pool_5: number; prize_pool_4: number; prize_pool_3: number
  jackpot_rolled: boolean; published_at: string | null
}
export interface DrawEntry {
  id: string; draw_id: string; entry_numbers: number[]; match_count: number
  is_winner: boolean; draw?: Draw; payout?: WinnerPayout[]
}
export interface WinnerPayout {
  id: string; match_type: MatchType; gross_amount: number; proof_url: string | null
  proof_status: ProofStatus; payment_status: PaymentStatus; created_at: string
  draw?: { draw_month: string }; user?: User
}
export interface DashboardData {
  user: User; subscription: Subscription | null; scores: GolfScore[]
  draw_entries: DrawEntry[]; payouts: WinnerPayout[]
  stats: { total_won: number; draws_entered: number; avg_score: number }
}
export interface AdminStats {
  total_users: number; active_subscribers: number; total_charity_donated: number
  monthly_prize_pool: number
  prize_pool_breakdown: { match_5: number; match_4: number; match_3: number }
  pending_payouts: number
}
