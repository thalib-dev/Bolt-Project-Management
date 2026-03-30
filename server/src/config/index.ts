import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'openclaw-super-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/openclaw',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
};
