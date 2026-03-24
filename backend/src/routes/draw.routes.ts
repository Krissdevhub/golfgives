import { Router } from 'express';
import {
  listDraws,
  getMyDrawEntries,
  simulateDraw,
  publishDraw,
} from '../controllers/draw.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();
router.get('/', listDraws);
router.get('/my-entries', authenticate, getMyDrawEntries);
router.post('/simulate', authenticate, requireAdmin, simulateDraw);
router.post('/publish', authenticate, requireAdmin, publishDraw);

export default router;
