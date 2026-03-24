import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import supabase from '../lib/supabase';
import { AppError } from '../middleware/error.middleware';
import type { GolfScore } from '../types';

// ─────────────────────────────────────────────────────────────
// DRAW ENGINE UTILITIES
// ─────────────────────────────────────────────────────────────

/**
 * Random draw: generates 5 unique random numbers between 1–45.
 */
function randomDraw(): number[] {
  const numbers = new Set<number>();
  while (numbers.size < 5) {
    numbers.add(Math.floor(Math.random() * 45) + 1);
  }
  return Array.from(numbers);
}

/**
 * Algorithmic draw: weights numbers based on frequency in user scores.
 * Numbers that appear more often across active users have higher probability.
 */
async function algorithmicDraw(): Promise<number[]> {
  // Pull all scores from active subscribers in last 3 months
  const since = new Date();
  since.setMonth(since.getMonth() - 3);

  const { data: scores } = await supabase
    .from('golf_scores')
    .select('score')
    .gte('played_on', since.toISOString().split('T')[0]);

  if (!scores || scores.length === 0) {
    return randomDraw();
  }

  // Build frequency map
  const freq: Record<number, number> = {};
  for (let i = 1; i <= 45; i++) freq[i] = 1; // base weight
  for (const { score } of scores) {
    freq[score] = (freq[score] ?? 1) + 1;
  }

  // Weighted random selection
  const selected = new Set<number>();
  const totalWeight = Object.values(freq).reduce((a, b) => a + b, 0);

  while (selected.size < 5) {
    let rand = Math.random() * totalWeight;
    for (const [numStr, weight] of Object.entries(freq)) {
      rand -= weight;
      if (rand <= 0) {
        selected.add(Number(numStr));
        break;
      }
    }
  }

  return Array.from(selected);
}

/**
 * Count how many of the user's numbers match the drawn numbers.
 */
function countMatches(userNumbers: number[], drawnNumbers: number[]): number {
  const drawnSet = new Set(drawnNumbers);
  return userNumbers.filter(n => drawnSet.has(n)).length;
}

/**
 * Calculate prize pools from total pool amount.
 */
function calculatePools(totalPool: number, jackpotCarryover = 0) {
  return {
    pool_5: Math.floor(totalPool * 0.40) + jackpotCarryover,
    pool_4: Math.floor(totalPool * 0.35),
    pool_3: Math.floor(totalPool * 0.25),
  };
}

// ─────────────────────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────────────────────

// ── GET /api/draws — list published draws ─────────────────────
export async function listDraws(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data: draws, error } = await supabase
      .from('draws')
      .select('*')
      .eq('status', 'published')
      .order('draw_month', { ascending: false })
      .limit(12);

    if (error) throw new AppError(500, 'Failed to fetch draws');

    res.json({ success: true, data: draws ?? [] });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/draws/my-entries — user's draw history ──────────
export async function getMyDrawEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('draw_entries')
      .select(`
        *,
        draw:draws (draw_month, drawn_numbers, status, prize_pool_5, prize_pool_4, prize_pool_3),
        payout:winner_payouts (match_type, gross_amount, proof_status, payment_status)
      `)
      .eq('user_id', req.user!.userId)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(500, 'Failed to fetch draw entries');

    res.json({ success: true, data: data ?? [] });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/draws/simulate (admin) ─────────────────────────
export async function simulateDraw(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({
      draw_type: z.enum(['random', 'algorithmic']).default('random'),
      draw_month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed' });
      return;
    }

    const drawMonth = parsed.data.draw_month ?? new Date().toISOString().slice(0, 7);
    const drawType = parsed.data.draw_type;

    // Generate drawn numbers
    const drawnNumbers =
      drawType === 'algorithmic' ? await algorithmicDraw() : randomDraw();

    // Count active subscribers
    const { count: subscriberCount } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const monthlyPool = (subscriberCount ?? 0) * 900; // £9 per subscriber in pence

    // Check for jackpot rollover from previous month
    const prevMonth = new Date(drawMonth + '-01');
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = prevMonth.toISOString().slice(0, 7);

    const { data: prevDraw } = await supabase
      .from('draws')
      .select('jackpot_rolled, prize_pool_5')
      .eq('draw_month', prevMonthStr)
      .eq('status', 'published')
      .single();

    const jackpotCarryover = prevDraw?.jackpot_rolled ? (prevDraw.prize_pool_5 ?? 0) : 0;
    const pools = calculatePools(monthlyPool, jackpotCarryover);

    // Pre-check who would win (simulation only — not saved)
    const { data: allScores } = await supabase
      .from('golf_scores')
      .select('user_id, score, played_on')
      .order('played_on', { ascending: false });

    // Group latest 5 scores per user
    const userScoresMap: Record<string, number[]> = {};
    for (const row of (allScores ?? []) as GolfScore[]) {
      if (!userScoresMap[row.user_id]) userScoresMap[row.user_id] = [];
      if (userScoresMap[row.user_id].length < 5) {
        userScoresMap[row.user_id].push(row.score);
      }
    }

    const winners: { userId: string; matchCount: number }[] = [];
    for (const [userId, userNums] of Object.entries(userScoresMap)) {
      const matches = countMatches(userNums, drawnNumbers);
      if (matches >= 3) winners.push({ userId, matchCount: matches });
    }

    res.json({
      success: true,
      data: {
        draw_month: drawMonth,
        draw_type: drawType,
        drawn_numbers: drawnNumbers,
        prize_pools: {
          match_5: pools.pool_5 / 100,   // convert pence → pounds
          match_4: pools.pool_4 / 100,
          match_3: pools.pool_3 / 100,
        },
        jackpot_carryover: jackpotCarryover / 100,
        winner_preview: {
          total: winners.length,
          match_5: winners.filter(w => w.matchCount === 5).length,
          match_4: winners.filter(w => w.matchCount === 4).length,
          match_3: winners.filter(w => w.matchCount === 3).length,
        },
        note: 'This is a simulation only — results not saved.',
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/draws/publish (admin) ──────────────────────────
export async function publishDraw(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({
      draw_type: z.enum(['random', 'algorithmic']).default('random'),
      draw_month: z.string().regex(/^\d{4}-\d{2}$/),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed' });
      return;
    }

    const { draw_type, draw_month } = parsed.data;

    // Prevent duplicate publish for same month
    const { data: existingDraw } = await supabase
      .from('draws')
      .select('id, status')
      .eq('draw_month', draw_month)
      .eq('status', 'published')
      .single();

    if (existingDraw) {
      throw new AppError(409, `A draw for ${draw_month} has already been published`);
    }

    const drawnNumbers = draw_type === 'algorithmic' ? await algorithmicDraw() : randomDraw();

    // Count active subscribers for pool
    const { count: subscriberCount } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const monthlyPool = (subscriberCount ?? 0) * 900;
    const pools = calculatePools(monthlyPool);

    // Create draw record
    const { data: draw, error: drawError } = await supabase
      .from('draws')
      .insert({
        draw_month,
        draw_type,
        drawn_numbers: drawnNumbers,
        status: 'published',
        prize_pool_5: pools.pool_5,
        prize_pool_4: pools.pool_4,
        prize_pool_3: pools.pool_3,
        jackpot_rolled: false,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (drawError || !draw) throw new AppError(500, 'Failed to create draw');

    // Get all active subscribers with their scores
    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active');

    const userIds = (activeSubs ?? []).map(s => s.user_id);

    const { data: allScores } = await supabase
      .from('golf_scores')
      .select('user_id, score, played_on')
      .in('user_id', userIds)
      .order('played_on', { ascending: false });

    // Build entries + detect winners
    const userScoresMap: Record<string, number[]> = {};
    for (const row of (allScores ?? []) as GolfScore[]) {
      if (!userScoresMap[row.user_id]) userScoresMap[row.user_id] = [];
      if (userScoresMap[row.user_id].length < 5) {
        userScoresMap[row.user_id].push(row.score);
      }
    }

    const entries = [];
    const payouts = [];

    const winners3: string[] = [];
    const winners4: string[] = [];
    const winners5: string[] = [];

    for (const [userId, userNums] of Object.entries(userScoresMap)) {
      const matches = countMatches(userNums, drawnNumbers);
      const isWinner = matches >= 3;

      entries.push({
        draw_id: draw.id,
        user_id: userId,
        entry_numbers: userNums,
        match_count: matches,
        is_winner: isWinner,
      });

      if (matches === 5) winners5.push(userId);
      else if (matches === 4) winners4.push(userId);
      else if (matches === 3) winners3.push(userId);
    }

    // Insert all entries
    if (entries.length > 0) {
      await supabase.from('draw_entries').insert(entries);
    }

    // Determine jackpot — split equally if multiple winners
    const jackpotRolled = winners5.length === 0;

    if (jackpotRolled) {
      await supabase
        .from('draws')
        .update({ jackpot_rolled: true })
        .eq('id', draw.id);
    }

    // Build payout records
    const prize5 = winners5.length > 0 ? pools.pool_5 / winners5.length : 0;
    const prize4 = winners4.length > 0 ? pools.pool_4 / winners4.length : 0;
    const prize3 = winners3.length > 0 ? pools.pool_3 / winners3.length : 0;

    for (const userId of winners5) {
      payouts.push({ user_id: userId, draw_id: draw.id, match_type: '5_match', gross_amount: prize5 / 100 });
    }
    for (const userId of winners4) {
      payouts.push({ user_id: userId, draw_id: draw.id, match_type: '4_match', gross_amount: prize4 / 100 });
    }
    for (const userId of winners3) {
      payouts.push({ user_id: userId, draw_id: draw.id, match_type: '3_match', gross_amount: prize3 / 100 });
    }

    // We need draw_entry_id for each payout — fetch inserted entries
    if (payouts.length > 0) {
      const { data: insertedEntries } = await supabase
        .from('draw_entries')
        .select('id, user_id')
        .eq('draw_id', draw.id)
        .eq('is_winner', true);

      const entryMap: Record<string, string> = {};
      for (const e of (insertedEntries ?? [])) entryMap[e.user_id] = e.id;

      const payoutsWithEntryIds = payouts.map(p => ({
        ...p,
        draw_entry_id: entryMap[p.user_id],
      }));

      await supabase.from('winner_payouts').insert(payoutsWithEntryIds);
    }

    res.json({
      success: true,
      data: {
        draw,
        results: {
          total_entries: entries.length,
          winners_5_match: winners5.length,
          winners_4_match: winners4.length,
          winners_3_match: winners3.length,
          jackpot_rolled: jackpotRolled,
          prize_per_winner: {
            match_5: jackpotRolled ? 0 : prize5 / 100,
            match_4: prize4 / 100,
            match_3: prize3 / 100,
          },
        },
      },
      message: `Draw for ${draw_month} published successfully`,
    });
  } catch (err) {
    next(err);
  }
}
