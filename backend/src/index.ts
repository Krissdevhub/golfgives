import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import scoreRoutes from './routes/score.routes';
import subscriptionRoutes from './routes/subscription.routes';
import drawRoutes from './routes/draw.routes';
import charityRoutes from './routes/charity.routes';
import adminRoutes from './routes/admin.routes';
import webhookRoutes from './routes/webhook.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// ── 1. Security Headers ───────────────────────────────────────
// crossOriginResourcePolicy ko false rakha hai taaki images/requests block na hon
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// ── 2. Optimized CORS ─────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,          // Production Vercel URL
  'http://localhost:3000',            // Local Dev
  /\.vercel\.app$/                    // All Vercel Preview deployments
].filter(Boolean) as (string | RegExp)[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like Postman or Mobile)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.error(`CORS Blocked for: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// Explicitly handle OPTIONS requests
app.options('*', cors());

// ── 3. Rate Limiting ──────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Testing ke liye limit badha di hai
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ── 4. Stripe Webhooks (Raw body needed) ──────────────────────
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), webhookRoutes);

// ── 5. Body Parsing ───────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── 6. Logging ────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── 7. Health Check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV 
  });
});

// ── 8. Routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/draws', drawRoutes);
app.use('/api/charities', charityRoutes);
app.use('/api/admin', adminRoutes);

// ── 9. 404 Handler ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── 10. Global Error Handler ──────────────────────────────────
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GolfGives API running on port ${PORT}`);
});

export default app;