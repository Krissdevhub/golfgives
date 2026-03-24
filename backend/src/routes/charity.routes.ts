import { Router } from 'express';
import supabase from '../lib/supabase';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('charities')
      .select('id, name, description, category, image_url, website_url, is_featured, total_donated')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('name');
    if (error) throw error;
    res.json({ success: true, data: data ?? [] });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('charities')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_active', true)
      .single();
    if (error || !data) { res.status(404).json({ success: false, message: 'Charity not found' }); return; }
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;
