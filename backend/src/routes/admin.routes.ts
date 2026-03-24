import { Router } from 'express';
import {
  getStats,
  listUsers,
  updateUser,
  listWinners,
  verifyWinner,
  listCharitiesAdmin,
  createCharity,
  updateCharity,
} from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/stats', getStats);
router.get('/users', listUsers);
router.patch('/users/:id', updateUser);
router.get('/winners', listWinners);
router.patch('/winners/:id/verify', verifyWinner);
router.get('/charities', listCharitiesAdmin);
router.post('/charities', createCharity);
router.patch('/charities/:id', updateCharity);

export default router;
