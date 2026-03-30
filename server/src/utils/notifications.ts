import prisma from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    return await prisma.notification.create({
      data: {
        id: uuidv4(),
        ...params,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}
