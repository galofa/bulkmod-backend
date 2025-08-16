import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
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
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
