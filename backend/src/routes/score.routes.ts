// src/routes/score.routes.ts
import { Router } from 'express';
import { getScores, addScore, deleteScore } from '../controllers/score.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/', getScores);
router.post('/', addScore);
router.delete('/:id', deleteScore);

export default router;
