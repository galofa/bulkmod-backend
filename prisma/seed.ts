import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clean up existing data
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  const passwordHash = await bcrypt.hash('password123', 12);

  const user1 = await prisma.user.create({
    data: {
      username: 'testuser',
      email: 'test@example.com',
      passwordHash
    }
  });

  const user2 = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash
    }
  });

  console.log('Created users:', { user1, user2 });
  console.log('Database seed completed!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
