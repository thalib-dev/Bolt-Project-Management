import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production database...');

  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@bolt.com' },
    update: {},
    create: {
      email: 'admin@bolt.com',
      name: 'Bolt Admin',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`✅ Default Admin user created: ${admin.email}`);
  console.log('🚀 Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
