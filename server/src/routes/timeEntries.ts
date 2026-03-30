import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

const router = Router();

const timeEntrySchema = z.object({
  taskId: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  duration: z.number().optional(),
  notes: z.string().optional(),
  billable: z.boolean().optional(),
});

// POST /api/time-entries
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const parsed = timeEntrySchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);

    const data = parsed.data;
    const start = new Date(data.startTime);
    const end = data.endTime ? new Date(data.endTime) : undefined;
    const duration = data.duration || (end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0);

    const entry = await prisma.timeEntry.create({
      data: {
        taskId: data.taskId,
        userId: req.user!.userId,
        startTime: start,
        endTime: end,
        duration,
        notes: data.notes,
        billable: data.billable ?? true,
      },
      include: {
        task: { select: { id: true, title: true, projectId: true } },
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    res.status(201).json({ status: 'success', data: entry });
  })
);

// GET /api/time-entries
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { taskId, projectId, startDate, endDate, userId } = req.query;
    const where: any = {};
    if (taskId) where.taskId = taskId;
    if (userId) where.userId = userId;
    else where.userId = req.user!.userId;
    if (projectId) where.task = { projectId };
    if (startDate) where.startTime = { gte: new Date(startDate as string) };
    if (endDate) where.startTime = { ...where.startTime, lte: new Date(endDate as string) };

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        task: { select: { id: true, title: true, projectId: true, project: { select: { name: true } } } },
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    const totalMinutes = entries.reduce((sum: number, e: any) => sum + (e.duration || 0), 0);
    const billableMinutes = entries.filter((e: any) => e.billable).reduce((sum: number, e: any) => sum + (e.duration || 0), 0);

    res.json({
      status: 'success',
      data: entries,
      summary: { totalMinutes, billableMinutes, totalHours: +(totalMinutes / 60).toFixed(1), billableHours: +(billableMinutes / 60).toFixed(1) },
    });
  })
);

// PATCH /api/time-entries/:id/approve
router.patch(
  '/:id/approve',
  authenticate,
  asyncHandler(async (req, res) => {
    const entry = await prisma.timeEntry.update({
      where: { id: req.params.id },
      data: { approved: true },
    });
    res.json({ status: 'success', data: entry });
  })
);

// DELETE /api/time-entries/:id
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await prisma.timeEntry.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
