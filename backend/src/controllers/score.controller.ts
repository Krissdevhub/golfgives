import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import supabase from '../lib/supabase';
import { AppError } from '../middleware/error.middleware';

const addScoreSchema = z.object({
  score: z
    .number({ invalid_type_error: 'Score must be a number' })
    .int()
    .min(1, 'Minimum score is 1')
    .max(45, 'Maximum score is 45 (Stableford)'),
  played_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

// ── GET /api/scores ───────────────────────────────────────────
export async function getScores(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data: scores, error } = await supabase
      .from('golf_scores')
      .select('*')
      .eq('user_id', req.user!.userId)
      .order('played_on', { ascending: false })
      .limit(5);

    if (error) throw new AppError(500, 'Failed to fetch scores');

    res.json({ success: true, data: scores ?? [] });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/scores ──────────────────────────────────────────
// The DB trigger enforces the 5-score limit automatically.
export async function addScore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = addScoreSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    // Prevent future dates
    const playedDate = new Date(parsed.data.played_on);
    if (playedDate > new Date()) {
      throw new AppError(400, 'Score date cannot be in the future');
    }

    const { data: newScore, error } = await supabase
      .from('golf_scores')
      .insert({
        user_id: req.user!.userId,
        score: parsed.data.score,
        played_on: parsed.data.played_on,
      })
      .select()
      .single();

    if (error || !newScore) {
      throw new AppError(500, 'Failed to save score');
    }

    // Return updated list (trigger may have removed the oldest)
    const { data: updatedScores } = await supabase
      .from('golf_scores')
      .select('*')
      .eq('user_id', req.user!.userId)
      .order('played_on', { ascending: false })
      .limit(5);

    res.status(201).json({
      success: true,
      data: { newScore, scores: updatedScores ?? [] },
      message: 'Score added successfully',
    });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/scores/:id ────────────────────────────────────
export async function deleteScore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    // Ensure score belongs to this user
    const { data: existing } = await supabase
      .from('golf_scores')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (!existing) throw new AppError(404, 'Score not found');
    if (existing.user_id !== req.user!.userId) throw new AppError(403, 'Forbidden');

    const { error } = await supabase.from('golf_scores').delete().eq('id', id);
    if (error) throw new AppError(500, 'Failed to delete score');

    res.json({ success: true, message: 'Score deleted' });
  } catch (err) {
    next(err);
  }
}
