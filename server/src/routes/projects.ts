import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = Router();

const projectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  budget: z.number().optional(),
  spent: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  color: z.string().optional(),
});

// GET /api/projects
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
          { visibility: 'PUBLIC' },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Calculate task stats for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (p: any) => {
        const taskStats = await prisma.task.groupBy({
          by: ['status'],
          where: { projectId: p.id, parentTaskId: null },
          _count: { status: true },
        });
        const totalTasks = taskStats.reduce((sum: number, s: any) => sum + s._count.status, 0);
        const doneTasks = taskStats.find((s: any) => s.status === 'DONE')?._count.status || 0;
        
        // Calculate total spent from all tasks
        const totalSpentRes = await prisma.task.aggregate({
          where: { projectId: p.id },
          _sum: { spent: true }
        });
        const totalSpent = Number(totalSpentRes._sum.spent || 0);

        return {
          ...p,
          spent: totalSpent,
          stats: { total: totalTasks, done: doneTasks, progress: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0, byStatus: taskStats },
        };
      })
    );

    res.json({ status: 'success', data: projectsWithStats });
  })
);

// POST /api/projects
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);

    const data = parsed.data;
    const project = await prisma.project.create({
      data: {
        name: data.name!,
        description: data.description,
        status: data.status as any || 'PLANNING',
        visibility: data.visibility as any || 'PUBLIC',
        budget: data.budget,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        color: data.color,
        ownerId: req.user!.userId,
        members: {
          create: { userId: req.user!.userId, role: 'ADMIN' },
        },
      },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
    });

    // Activity Log
    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'PROJECT',
        entityId: project.id,
        metadata: { name: project.name },
      },
    });

    // Notify all users if project is PUBLIC
    if (project.visibility === 'PUBLIC') {
      const { createNotification } = require('../utils/notifications');
      const users = await prisma.user.findMany({ where: { id: { not: req.user!.userId } }, select: { id: true } });
      for (const u of users) {
        await createNotification({
          userId: u.id,
          type: 'PROJECT_CREATED',
          title: 'New Public Project',
          message: `${req.user!.name} created a new public project: "${project.name}"`,
          link: `/dashboard/projects/${project.id}`
        });
      }
    }

    res.status(201).json({ status: 'success', data: project });
  })
);

// GET /api/projects/:id
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        labels: true,
        _count: { select: { tasks: true } },
      },
    });
    if (!project) throw new NotFoundError('Project not found');

    const taskStats = await prisma.task.groupBy({
      by: ['status'],
      where: { projectId: project.id, parentTaskId: null },
      _count: { status: true },
    });
    const totalTasks = taskStats.reduce((sum: number, s: any) => sum + s._count.status, 0);
    const doneTasks = taskStats.find((s: any) => s.status === 'DONE')?._count.status || 0;
    
    const totalSpentRes = await prisma.task.aggregate({
      where: { projectId: project.id },
      _sum: { spent: true }
    });
    const totalSpent = Number(totalSpentRes._sum.spent || 0);

    res.json({
      status: 'success',
      data: {
        ...project,
        spent: totalSpent,
        stats: { total: totalTasks, done: doneTasks, progress: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0, byStatus: taskStats },
      },
    });
  })
);

// PATCH /api/projects/:id
router.patch(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const parsed = projectSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);

    const data = parsed.data;
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
    });
    res.json({ status: 'success', data: project });
  })
);

// PUT /api/projects/:id
router.put(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);

    const data = parsed.data;
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
    });
    res.json({ status: 'success', data: project });
  })
);

// DELETE /api/projects/:id
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

// POST /api/projects/:id/members
router.post(
  '/:id/members',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, role } = req.body;
    const member = await prisma.projectMember.create({
      data: { 
        projectId: req.params.id,
        userId,
        role: role || 'MEMBER',
      },
      include: { 
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        project: { select: { id: true, name: true } }
      },
    });

    // Activity Log
    await prisma.activityLog.create({
      data: {
        projectId: req.params.id,
        userId: req.user!.userId,
        action: 'INVITE',
        entityType: 'PROJECT_MEMBER',
        entityId: member.id,
        metadata: { invitedUserId: userId },
      },
    });

    // Notify user they were added to the project
    const { createNotification } = require('../utils/notifications');
    await createNotification({
      userId,
      type: 'PROJECT_INVITE',
      title: 'Added to Project',
      message: `You have been added to the project "${member.project.name}"`,
      link: `/dashboard/projects/${req.params.id}`
    });

    res.status(201).json({ status: 'success', data: member });
  })
);

export default router;
