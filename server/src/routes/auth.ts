import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/database';
import { config } from '../config';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthPayload } from '../middleware/auth';
import { ConflictError, UnauthorizedError, ValidationError } from '../utils/errors';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

function generateToken(user: { id: string; email: string; name: string; role: string }): string {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name, role: user.role } as AuthPayload,
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );
}

// POST /api/auth/register
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Validation failed', parsed.error.errors);
    }

    const { name, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true, createdAt: true },
    });

    const token = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    res.status(201).json({ status: 'success', data: { user, token } });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Validation failed', parsed.error.errors);
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    res.json({
      status: 'success',
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
        token,
      },
    });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true, createdAt: true },
    });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    res.json({ status: 'success', data: { user } });
  })
);

export default router;
