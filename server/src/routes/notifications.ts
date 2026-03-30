import { Router } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError } from '../utils/errors';

const router = Router();

// GET /api/notifications
router.get(
  '/notifications',
  authenticate,
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.userId, read: false },
    });

    res.json({ status: 'success', data: { notifications, unreadCount } });
  })
);

// PATCH /api/notifications/:id/read
router.patch(
  '/notifications/:id/read',
  authenticate,
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification || notification.userId !== req.user!.userId) {
      throw new NotFoundError('Notification not found');
    }

    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });

    res.json({ status: 'success' });
  })
);

// PATCH /api/notifications/read-all
router.patch(
  '/notifications/read-all',
  authenticate,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, read: false },
      data: { read: true },
    });

    res.json({ status: 'success' });
  })
);

export default router;
