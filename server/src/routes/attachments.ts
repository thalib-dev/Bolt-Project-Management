import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// POST /api/tasks/:taskId/attachments
router.post(
  '/tasks/:taskId/attachments',
  authenticate,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    if (!req.file) throw new ValidationError('No file uploaded');

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundError('Task not found');

    const attachment = await prisma.attachment.create({
      data: {
        id: uuidv4(),
        filename: req.file.originalname,
        url: `/uploads/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
        taskId,
        uploadedBy: req.user!.userId,
      },
    });

    res.status(201).json({ status: 'success', data: attachment });
  })
);

// GET /api/tasks/:taskId/attachments
router.get(
  '/tasks/:taskId/attachments',
  authenticate,
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ status: 'success', data: attachments });
  })
);

// DELETE /api/attachments/:id
router.delete(
  '/attachments/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const attachment = await prisma.attachment.findUnique({ where: { id: req.params.id } });
    if (!attachment) throw new NotFoundError('Attachment not found');

    // Delete file from disk
    const filePath = path.join(process.cwd(), attachment.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.attachment.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
