import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import supabase from '../lib/supabase';
import { AppError } from '../middleware/error.middleware';
import type { User, JwtPayload } from '../types';

// ── Validation schemas ────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

// ── Helper: sign JWT ──────────────────────────────────────────
function signToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  } as jwt.SignOptions);
}

// ── POST /api/auth/register ───────────────────────────────────
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password, full_name } = parsed.data;

    // Check existing user
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      throw new AppError(409, 'An account with this email already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Insert user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash,
        full_name,
        role: 'subscriber',
      })
      .select('id, email, full_name, role, is_active, created_at, updated_at')
      .single();

    if (error || !user) {
      throw new AppError(500, 'Failed to create account');
    }

    const token = signToken(user as User);

    // Set Cookie for Registration too
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, 
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
      },
      message: 'Account created successfully',
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/login ──────────────────────────────────────
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid credentials format' });
      return;
    }

    const { email, password } = parsed.data;

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (!user) {
      await bcrypt.hash(password, 12);
      throw new AppError(401, 'Invalid email or password');
    }

    if (!user.is_active) {
      throw new AppError(403, 'Your account has been deactivated. Contact support.');
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new AppError(401, 'Invalid email or password');
    }

    const token = signToken(user as User);

    // ── CRITICAL FIX: Set Secure Cookie ────────────────────────
    // Isse Next.js Middleware ko token mil jayega aur redirect loop band ho jayega
    res.cookie('token', token, {
      httpOnly: true,     // Security: Browser JS can't access it
      secure: true,       // Production (HTTPS) pe zaroori hai
      sameSite: 'none',   // Vercel -> Railway communication ke liye 'none' chahiye
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/auth/me ──────────────────────────────────────────
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, email, full_name, role, is_active, created_at,
        subscriptions (
          id, plan_type, status, charity_percentage, amount_pence,
          current_period_end,
          charity:charities (id, name, image_url)
        )
      `)
      .eq('id', req.user!.userId)
      .single();

    if (error || !user) {
      throw new AppError(404, 'User not found');
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}