import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import supabase from '../lib/supabase';
import { AppError } from '../middleware/error.middleware';

// ── GET /api/admin/stats ──────────────────────────────────────
export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [
      { count: totalUsers },
      { count: activeSubscribers },
      { data: donations },
      { count: pendingPayouts },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'subscriber'),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('charity_donations').select('amount'),
      supabase.from('winner_payouts').select('*', { count: 'exact', head: true }).eq('payment_status', 'pending'),
    ]);

    const totalDonated = (donations ?? []).reduce((sum: number, d: { amount: number }) => sum + Number(d.amount), 0);
    const monthlyPool = (activeSubscribers ?? 0) * 9; // £9 per subscriber

    res.json({
      success: true,
      data: {
        total_users: totalUsers ?? 0,
        active_subscribers: activeSubscribers ?? 0,
        total_charity_donated: totalDonated,
        monthly_prize_pool: monthlyPool,
        prize_pool_breakdown: {
          match_5: Math.floor(monthlyPool * 0.40),
          match_4: Math.floor(monthlyPool * 0.35),
          match_3: Math.floor(monthlyPool * 0.25),
        },
        pending_payouts: pendingPayouts ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/users ──────────────────────────────────────
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(String(req.query.page ?? '1'));
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = String(req.query.search ?? '');

    let query = supabase
      .from('users')
      .select(`
        id, email, full_name, role, is_active, created_at,
        subscriptions (id, plan_type, status, charity_percentage, current_period_end),
        golf_scores (id)
      `, { count: 'exact' })
      .eq('role', 'subscriber')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: users, count, error } = await query;
    if (error) throw new AppError(500, 'Failed to fetch users');

    res.json({
      success: true,
      data: {
        users: users ?? [],
        pagination: {
          page,
          limit,
          total: count ?? 0,
          pages: Math.ceil((count ?? 0) / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/admin/users/:id ────────────────────────────────
export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({
      full_name: z.string().min(2).optional(),
      is_active: z.boolean().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed' });
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) throw new AppError(500, 'Failed to update user');

    res.json({ success: true, message: 'User updated' });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/winners ────────────────────────────────────
export async function listWinners(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('winner_payouts')
      .select(`
        *,
        user:users (id, email, full_name),
        draw:draws (draw_month, drawn_numbers)
      `)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(500, 'Failed to fetch winners');

    res.json({ success: true, data: data ?? [] });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/admin/winners/:id/verify ──────────────────────
export async function verifyWinner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({
      proof_status: z.enum(['approved', 'rejected']),
      admin_notes: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed' });
      return;
    }

    const updates: Record<string, unknown> = {
      proof_status: parsed.data.proof_status,
      admin_notes: parsed.data.admin_notes ?? null,
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.proof_status === 'approved') {
      updates.payment_status = 'paid';
      updates.paid_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('winner_payouts')
      .update(updates)
      .eq('id', req.params.id);

    if (error) throw new AppError(500, 'Failed to update winner');

    res.json({
      success: true,
      message: parsed.data.proof_status === 'approved'
        ? 'Winner approved and marked as paid'
        : 'Winner submission rejected',
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/charities ──────────────────────────────────
export async function listCharitiesAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('charities')
      .select('*')
      .order('name');

    if (error) throw new AppError(500, 'Failed to fetch charities');
    res.json({ success: true, data: data ?? [] });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/charities ─────────────────────────────────
export async function createCharity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      category: z.string().optional(),
      image_url: z.string().url().optional(),
      website_url: z.string().url().optional(),
      is_featured: z.boolean().default(false),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const { data: charity, error } = await supabase
      .from('charities')
      .insert(parsed.data)
      .select()
      .single();

    if (error || !charity) throw new AppError(500, 'Failed to create charity');

    res.status(201).json({ success: true, data: charity });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/admin/charities/:id ───────────────────────────
export async function updateCharity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      image_url: z.string().url().optional().nullable(),
      website_url: z.string().url().optional().nullable(),
      is_featured: z.boolean().optional(),
      is_active: z.boolean().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed' });
      return;
    }

    const { error } = await supabase
      .from('charities')
      .update(parsed.data)
      .eq('id', req.params.id);

    if (error) throw new AppError(500, 'Failed to update charity');
    res.json({ success: true, message: 'Charity updated' });
  } catch (err) {
    next(err);
  }
}
