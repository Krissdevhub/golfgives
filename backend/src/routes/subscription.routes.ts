import { Router } from 'express';
import {
  getMySubscription,
  createSubscription,
  updateCharity,
  cancelSubscription,
} from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/my', getMySubscription);
router.post('/', createSubscription);
router.patch('/charity', updateCharity);
router.delete('/', cancelSubscription);

export default router;
