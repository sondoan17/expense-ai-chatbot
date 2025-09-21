import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  { name: 'An uong', icon: 'food' },
  { name: 'Di chuyen', icon: 'transport' },
  { name: 'Nha o', icon: 'home' },
  { name: 'Mua sam', icon: 'shopping' },
  { name: 'Giai tri', icon: 'entertainment' },
  { name: 'Suc khoe', icon: 'health' },
  { name: 'Giao duc', icon: 'education' },
  { name: 'Hoa don', icon: 'bills' },
  { name: 'Thu nhap', icon: 'income' },
  { name: 'Khac', icon: 'other' },
];

async function main() {
  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category,
    });
  }
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
