import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { NotFoundError, ValidationError } from '../utils/errors';
import { createNotification } from '../utils/notifications';

const router = Router();

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
  estimatedHours: z.number().optional().nullable(),
  spent: z.number().optional().nullable(),
  position: z.number().optional(),
  projectId: z.string().optional(),
});

const taskInclude = {
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  creator: { select: { id: true, name: true, avatarUrl: true } },
  subtasks: {
    select: { id: true, title: true, status: true, priority: true, assignee: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { position: 'asc' as const },
  },
  taskLabels: { include: { label: true } },
  _count: { select: { comments: true, attachments: true, subtasks: true, timeEntries: true } },
};

// GET /api/projects/:projectId/tasks
router.get(
  '/projects/:projectId/tasks',
  authenticate,
  asyncHandler(async (req, res) => {
    const { status, priority, assigneeId, parentOnly } = req.query;
    const where: any = { projectId: req.params.projectId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId as string;
    if (parentOnly === 'true') where.parentTaskId = null;

    const tasks = await prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [{ status: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ status: 'success', data: tasks });
  })
);

// POST /api/projects/:projectId/tasks
router.post(
  '/projects/:projectId/tasks',
  authenticate,
  asyncHandler(async (req, res) => {
    const parsed = taskSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);

    const data = parsed.data;
    const maxPos = await prisma.task.aggregate({
      where: { projectId: req.params.projectId, status: data.status || 'TODO', parentTaskId: data.parentTaskId || null },
      _max: { position: true },
    });

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status as any || 'TODO',
        priority: data.priority as any || 'MEDIUM',
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        assigneeId: data.assigneeId,
        parentTaskId: data.parentTaskId,
        estimatedHours: data.estimatedHours,
        spent: data.spent,
        position: (maxPos._max.position || 0) + 1,
        projectId: req.params.projectId,
        creatorId: req.user!.userId,
      },
      include: taskInclude,
    });

    // Notify assignee
    if (task.assigneeId && task.assigneeId !== req.user!.userId) {
      await createNotification({
        userId: task.assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'New task assigned',
        message: `You have been assigned to "${task.title}"`,
        link: `/dashboard/projects/${req.params.projectId}`,
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        projectId: req.params.projectId,
        userId: req.user!.userId,
        action: 'CREATED',
        entityType: 'TASK',
        entityId: task.id,
        metadata: { title: task.title },
      },
    });

    res.status(201).json({ status: 'success', data: task });
  })
);

// GET /api/tasks/:id
router.get(
  '/tasks/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        ...taskInclude,
        comments: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        timeEntries: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { startTime: 'desc' },
          take: 10,
        },
        dependencies: { include: { dependsOn: { select: { id: true, title: true, status: true } } } },
      },
    });
    if (!task) throw new NotFoundError('Task not found');
    res.json({ status: 'success', data: task });
  })
);

// PUT /api/tasks/:id
router.put(
  '/tasks/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const parsed = taskSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);

    const data = parsed.data;
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : data.startDate === null ? null : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
        status: data.status as any,
        priority: data.priority as any,
        spent: data.spent,
      },
      include: taskInclude,
    });

    // Log status change
    if (data.status) {
      await prisma.activityLog.create({
        data: {
          projectId: task.projectId,
          userId: req.user!.userId,
          action: 'STATUS_CHANGED',
          entityType: 'TASK',
          entityId: task.id,
          metadata: { title: task.title, status: data.status },
        },
      });

      // Notify assignee if someone else changed the status
      if (task.assigneeId && task.assigneeId !== req.user!.userId) {
        await createNotification({
          userId: task.assigneeId,
          type: 'STATUS_CHANGED',
          title: 'Task status updated',
          message: `The status of "${task.title}" was updated to ${data.status.replace('_', ' ')}`,
          link: `/dashboard/projects/${task.projectId}`,
        });
      }
    }

    res.json({ status: 'success', data: task });
  })
);

// DELETE /api/tasks/:id
router.delete(
  '/tasks/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

// PATCH /api/tasks/:id/position - reorder tasks
router.patch(
  '/tasks/:id/position',
  authenticate,
  asyncHandler(async (req, res) => {
    const { status, position } = req.body;
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { status: status as any, position },
      include: taskInclude,
    });
    res.json({ status: 'success', data: task });
  })
);

// POST /api/tasks/:id/comments
router.post(
  '/tasks/:id/comments',
  authenticate,
  asyncHandler(async (req, res) => {
    const { content } = req.body;
    let { mentions } = req.body;
    if (!content) throw new ValidationError('Content is required');

    // Automatic mention extraction if not provided or empty
    if (!mentions || !Array.isArray(mentions) || mentions.length === 0) {
      mentions = [];
      const task = await prisma.task.findUnique({ where: { id: req.params.id }, select: { projectId: true } });
      if (task) {
        const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { visibility: true } });
        
        // Define users list to search for mentions
        let usersForMentions: { id: string, name: string }[] = [];
        
        if (project?.visibility === 'PUBLIC') {
          // For public projects, any user in the system can be mentioned
          const systemUsers = await prisma.user.findMany({ select: { id: true, name: true } });
          usersForMentions = systemUsers;
        } else {
          // For private projects, only project members can be mentioned
          const projectMembers = await prisma.projectMember.findMany({
            where: { projectId: task.projectId },
            include: { user: { select: { id: true, name: true } } },
          });
          usersForMentions = projectMembers.map(m => m.user);
        }

        // Sort members by name length descending to check for longer names first
        const sortedMembers = [...usersForMentions].sort((a, b) => b.name.length - a.name.length);
        
        for (const member of sortedMembers) {
          const escapedName = member.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const nameRegex = new RegExp(`@${escapedName}(?=\\s|$|[.,!?:;])`, 'gi');
          if (nameRegex.test(content)) {
            if (!mentions.includes(member.id)) {
              mentions.push(member.id);
            }
          }
        }
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId: req.params.id,
        userId: req.user!.userId,
        mentions: mentions || [],
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    // Create notifications for mentioned users
    if (mentions?.length) {
      const task = await prisma.task.findUnique({ where: { id: req.params.id }, select: { title: true, projectId: true } });
      for (const userId of mentions) {
        if (userId === req.user!.userId) continue;
        await createNotification({
          userId,
          type: 'MENTION',
          title: 'You were mentioned',
          message: `${comment.user.name} mentioned you in "${task?.title}"`,
          link: `/dashboard/projects/${task?.projectId}`,
        });

        // Simulation: Log that an email would be sent
        await prisma.activityLog.create({
          data: {
            projectId: task?.projectId || '',
            userId,
            action: 'EMAIL_SENT',
            entityType: 'NOTIFICATION',
            entityId: comment.id,
            metadata: { type: 'MENTION', to: userId, mock: true },
          },
        });
      }
    }

    // Notify assignee if someone else commented
    const task = await prisma.task.findUnique({ where: { id: req.params.id }, select: { title: true, projectId: true, assigneeId: true } });
    if (task?.assigneeId && task.assigneeId !== req.user!.userId && !mentions?.includes(task.assigneeId)) {
      await createNotification({
        userId: task.assigneeId,
        type: 'COMMENT_ADDED',
        title: 'New comment on your task',
        message: `${comment.user.name} commented on "${task.title}"`,
        link: `/dashboard/projects/${task.projectId}`,
      });
    }

    res.status(201).json({ status: 'success', data: comment });
  })
);

// GET /api/tasks/:id/comments
router.get(
  '/tasks/:id/comments',
  authenticate,
  asyncHandler(async (req, res) => {
    const comments = await prisma.comment.findMany({
      where: { taskId: req.params.id },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ status: 'success', data: comments });
  })
);

export default router;
