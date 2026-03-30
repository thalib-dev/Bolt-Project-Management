import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import timeEntryRoutes from './routes/timeEntries';
import attachmentRoutes from './routes/attachments';
import notificationRoutes from './routes/notifications';
import miscRoutes from './routes/misc';

const app = express();
app.use(helmet());

// Security & performance middleware
const allowedOrigins = [
  config.corsOrigin,
  'http://localhost:3000',
  'http://[::1]:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({ 
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }, 
  credentials: true 
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', taskRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/api', attachmentRoutes);
app.use('/api', notificationRoutes);
app.use('/api', miscRoutes);

// Serve uploads statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Global error handler
app.use(errorHandler);

// Start server (local only)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`🚀 OpenClaw API server running on port ${config.port}`);
    console.log(`   Health: http://localhost:${config.port}/api/health`);
  });
}

export default app;
