import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import supabase from '../lib/supabase';
import { AppError } from '../middleware/error.middleware';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

// GET /api/users/dashboard — everything needed for the dashboard in one call
router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const [
      { data: user },
      { data: scores },
      { data: subscription },
      { data: entries },
      { data: payouts },
    ] = await Promise.all([
      supabase.from('users').select('id, email, full_name, role').eq('id', userId).single(),
      supabase.from('golf_scores').select('*').eq('user_id', userId).order('played_on', { ascending: false }).limit(5),
      supabase.from('subscriptions').select('*, charity:charities(id,name,image_url,category)').eq('user_id', userId).in('status', ['active','pending']).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('draw_entries').select('*, draw:draws(draw_month,drawn_numbers,status)').eq('user_id', userId).order('created_at', { ascending: false }).limit(6),
      supabase.from('winner_payouts').select('*, draw:draws(draw_month)').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    const totalWon = (payouts ?? []).reduce((s: number, p: { gross_amount: number }) => s + Number(p.gross_amount), 0);
    const drawsEntered = (entries ?? []).length;

    res.json({
      success: true,
      data: {
        user,
        subscription: subscription ?? null,
        scores: scores ?? [],
        draw_entries: entries ?? [],
        payouts: payouts ?? [],
        stats: {
          total_won: totalWon,
          draws_entered: drawsEntered,
          avg_score: scores?.length
            ? Math.round((scores as { score: number }[]).reduce((s, sc) => s + sc.score, 0) / scores.length)
            : 0,
        },
      },
    });
  } catch (err) { next(err); }
});

// POST /api/users/proof — upload winner proof URL
router.post('/proof', async (req, res, next) => {
  try {
    const schema = z.object({
      payout_id: z.string().uuid(),
      proof_url: z.string().url(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ success: false, message: 'Validation failed' }); return; }

    const { data: payout } = await supabase
      .from('winner_payouts')
      .select('user_id')
      .eq('id', parsed.data.payout_id)
      .single();

    if (!payout || payout.user_id !== req.user!.userId) {
      throw new AppError(403, 'Forbidden');
    }

    await supabase
      .from('winner_payouts')
      .update({ proof_url: parsed.data.proof_url, proof_status: 'pending_review', updated_at: new Date().toISOString() })
      .eq('id', parsed.data.payout_id);

    res.json({ success: true, message: 'Proof submitted for review' });
  } catch (err) { next(err); }
});

export default router;
