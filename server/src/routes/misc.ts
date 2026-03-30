import { Router } from 'express';
import prisma from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/notifications
router.get(
  '/',
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
    res.json({ status: 'success', data: notifications, unreadCount });
  })
);

// PATCH /api/notifications/:id/read
router.patch(
  '/:id/read',
  authenticate,
  asyncHandler(async (req, res) => {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json({ status: 'success' });
  })
);

// PATCH /api/notifications/read-all
router.patch(
  '/read-all',
  authenticate,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, read: false },
      data: { read: true },
    });
    res.json({ status: 'success' });
  })
);

// GET /api/reports/completion
router.get(
  '/reports/completion',
  authenticate,
  asyncHandler(async (req, res) => {
    const { projectId } = req.query;
    const where: any = projectId ? { projectId, parentTaskId: null } : { parentTaskId: null };

    const stats = await prisma.task.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });
    const total = stats.reduce((sum: number, s: any) => sum + s._count.status, 0);
    const done = stats.find((s: any) => s.status === 'DONE')?._count.status || 0;

    res.json({
      status: 'success',
      data: {
        total,
        done,
        completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
        byStatus: stats,
      },
    });
  })
);

// GET /api/reports/workload
router.get(
  '/reports/workload',
  authenticate,
  asyncHandler(async (req, res) => {
    const { projectId } = req.query;
    const where: any = { status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] }, assigneeId: { not: null } };
    if (projectId) where.projectId = projectId;

    const workload = await prisma.task.groupBy({
      by: ['assigneeId'],
      where,
      _count: { id: true },
    });

    const userIds = workload.map((w: any) => w.assigneeId!).filter(Boolean);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, avatarUrl: true },
    });

    const data = workload.map((w: any) => ({
      user: users.find((u: any) => u.id === w.assigneeId),
      taskCount: w._count.id,
    }));

    res.json({ status: 'success', data });
  })
);

// GET /api/reports/health
router.get(
  '/reports/health',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const projects = await prisma.project.findMany({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      select: { id: true, name: true, status: true, startDate: true, endDate: true, budget: true, spent: true },
    });

    const health = await Promise.all(
      projects.map(async (p: any) => {
        const tasks = await prisma.task.groupBy({
          by: ['status'],
          where: { projectId: p.id, parentTaskId: null },
          _count: { status: true },
        });
        const total = tasks.reduce((sum: number, t: any) => sum + t._count.status, 0);
        const done = tasks.find((t: any) => t.status === 'DONE')?._count.status || 0;
        const overdue = await prisma.task.count({
          where: { projectId: p.id, dueDate: { lt: new Date() }, status: { not: 'DONE' } },
        });

        return { ...p, progress: total > 0 ? Math.round((done / total) * 100) : 0, totalTasks: total, doneTasks: done, overdueTasks: overdue };
      })
    );

    res.json({ status: 'success', data: health });
  })
);

// GET /api/activity
router.get(
  '/activity',
  authenticate,
  asyncHandler(async (req, res) => {
    const { projectId } = req.query;
    const where: any = {};
    if (projectId) where.projectId = projectId;

    const activities = await prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ status: 'success', data: activities });
  })
);

// GET /api/team/members
router.get(
  '/team/members',
  authenticate,
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, avatarUrl: true, role: true },
    });
    res.json({ status: 'success', data: users });
  })
);

export default router;
