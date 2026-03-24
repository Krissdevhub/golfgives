import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import supabase from '../lib/supabase';
import { AppError } from '../middleware/error.middleware';

// ─────────────────────────────────────────────────────────────
// DEMO MODE: No Stripe. Subscriptions are activated instantly.
// When you're ready for production, replace this file with the
// Stripe version (subscription.controller.stripe.ts).
// ─────────────────────────────────────────────────────────────

const PLAN_AMOUNTS: Record<string, number> = {
  monthly: 900,   // £9.00 in pence
  yearly:  9000,  // £90.00 in pence
};

const createSubSchema = z.object({
  plan_type:          z.enum(['monthly', 'yearly']),
  charity_id:         z.string().uuid().optional().nullable(),
  charity_percentage: z.number().int().min(10).max(50).default(10),
});

// ── GET /api/subscriptions/my ─────────────────────────────────
export async function getMySubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data: sub, error } = await supabase
      .from('subscriptions')
      .select(`*, charity:charities (id, name, description, image_url, category)`)
      .eq('user_id', req.user!.userId)
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw new AppError(500, 'Failed to fetch subscription');

    res.json({ success: true, data: sub ?? null });
  } catch (err) { next(err); }
}

// ── POST /api/subscriptions ─── DEMO: instantly active ───────
export async function createSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createSubSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const { plan_type, charity_id, charity_percentage } = parsed.data;

    // Check existing active sub
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', req.user!.userId)
      .eq('status', 'active')
      .single();

    if (existing) throw new AppError(409, 'You already have an active subscription');

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);
    if (plan_type === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const { data: sub, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id:              req.user!.userId,
        charity_id:           charity_id ?? null,
        plan_type,
        status:               'active',          // instantly active — no payment needed
        stripe_customer_id:   'demo_mode',
        stripe_subscription_id: `demo_${Date.now()}`,
        charity_percentage,
        amount_pence:         PLAN_AMOUNTS[plan_type],
        current_period_start: now.toISOString(),
        current_period_end:   periodEnd.toISOString(),
      })
      .select()
      .single();

    if (error || !sub) throw new AppError(500, 'Failed to create subscription');

    // Log an initial charity donation record
    if (charity_id) {
      const donationAmount = (PLAN_AMOUNTS[plan_type] * charity_percentage) / 10000;
      const month = now.toISOString().slice(0, 7);
      await supabase.from('charity_donations').insert({
        user_id:         req.user!.userId,
        charity_id,
        subscription_id: sub.id,
        amount:          donationAmount,
        donation_month:  month,
      });
    }

    res.status(201).json({
      success: true,
      data: { subscription: sub },
      message: 'Subscription activated successfully! (Demo Mode)',
    });
  } catch (err) { next(err); }
}

// ── PATCH /api/subscriptions/charity ─────────────────────────
export async function updateCharity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({
      charity_id:         z.string().uuid(),
      charity_percentage: z.number().int().min(10).max(50),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ success: false, message: 'Validation failed' }); return; }

    const { error } = await supabase
      .from('subscriptions')
      .update({ charity_id: parsed.data.charity_id, charity_percentage: parsed.data.charity_percentage, updated_at: new Date().toISOString() })
      .eq('user_id', req.user!.userId)
      .eq('status', 'active');

    if (error) throw new AppError(500, 'Failed to update charity preference');
    res.json({ success: true, message: 'Charity updated' });
  } catch (err) { next(err); }
}

// ── DELETE /api/subscriptions ─────────────────────────────────
export async function cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', req.user!.userId)
      .eq('status', 'active')
      .single();

    if (!sub) throw new AppError(404, 'No active subscription found');

    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', sub.id);

    res.json({ success: true, message: 'Subscription cancelled.' });
  } catch (err) { next(err); }
}