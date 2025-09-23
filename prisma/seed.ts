import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  { name: 'Ăn uống', icon: 'food' },
  { name: 'Di chuyển', icon: 'transport' },
  { name: 'Nhà ở', icon: 'home' },
  { name: 'Mua sắm', icon: 'shopping' },
  { name: 'Giải trí', icon: 'entertainment' },
  { name: 'Sức khỏe', icon: 'health' },
  { name: 'Giáo dục', icon: 'education' },
  { name: 'Hóa đơn', icon: 'bills' },
  { name: 'Thu nhập', icon: 'income' },
  { name: 'Khác', icon: 'other' },
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
