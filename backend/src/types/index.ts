// ──────────────────────────────────────────────────────────────
// GolfGives — Shared Types
// ──────────────────────────────────────────────────────────────

export type UserRole = 'subscriber' | 'admin';
export type SubscriptionStatus = 'active' | 'cancelled' | 'lapsed' | 'pending';
export type PlanType = 'monthly' | 'yearly';
export type DrawType = 'random' | 'algorithmic';
export type DrawStatus = 'simulated' | 'published' | 'archived';
export type MatchType = '5_match' | '4_match' | '3_match';
export type ProofStatus = 'awaiting' | 'pending_review' | 'approved' | 'rejected';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Charity {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  website_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  total_donated: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  charity_id: string | null;
  plan_type: PlanType;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  charity_percentage: number;
  amount_pence: number;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  charity?: Charity;
}

export interface GolfScore {
  id: string;
  user_id: string;
  score: number;
  played_on: string;
  created_at: string;
}

export interface Draw {
  id: string;
  draw_month: string;
  draw_type: DrawType;
  drawn_numbers: number[];
  status: DrawStatus;
  prize_pool_5: number;
  prize_pool_4: number;
  prize_pool_3: number;
  jackpot_rolled: boolean;
  published_at: string | null;
  created_at: string;
}

export interface DrawEntry {
  id: string;
  draw_id: string;
  user_id: string;
  entry_numbers: number[];
  match_count: number;
  is_winner: boolean;
  created_at: string;
}

export interface WinnerPayout {
  id: string;
  draw_entry_id: string;
  user_id: string;
  draw_id: string;
  match_type: MatchType;
  gross_amount: number;
  proof_url: string | null;
  proof_status: ProofStatus;
  payment_status: PaymentStatus;
  admin_notes: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  user?: User;
  draw?: Draw;
}

// ── JWT payload ───────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ── API response wrappers ─────────────────────────────────────
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
