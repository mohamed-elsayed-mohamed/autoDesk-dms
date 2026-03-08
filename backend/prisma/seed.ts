import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    {
      email: 'inventory@dms.local',
      passwordHash,
      firstName: 'Inventory',
      lastName: 'Manager',
      role: UserRole.InventoryManager,
    },
    {
      email: 'sales@dms.local',
      passwordHash,
      firstName: 'Sales',
      lastName: 'Consultant',
      role: UserRole.SalesConsultant,
    },
    {
      email: 'gm@dms.local',
      passwordHash,
      firstName: 'General',
      lastName: 'Manager',
      role: UserRole.GeneralManager,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }

  console.log('Seed complete: 3 users created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
