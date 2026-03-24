// ── auth.routes.ts ────────────────────────────────────────────
import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);

export default router;

// ─────────────────────────────────────────────────────────────
// Save each section below as its own file:
//
// src/routes/score.routes.ts
// src/routes/subscription.routes.ts
// src/routes/draw.routes.ts
// src/routes/charity.routes.ts
// src/routes/admin.routes.ts
// src/routes/webhook.routes.ts
// src/routes/user.routes.ts
// ─────────────────────────────────────────────────────────────
