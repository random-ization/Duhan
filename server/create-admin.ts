// @ts-ignore
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'ssunhr@gmail.com';

  // Get password from environment variable
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      'ADMIN_PASSWORD environment variable is required. ' +
        'Please set it in your .env file or environment. ' +
        'Example: ADMIN_PASSWORD=your_secure_password'
    );
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters long for security');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('正在更新管理员账号...');

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'ADMIN',
      tier: 'PAID',
      password: hashedPassword, // 更新为新密码
    },
    create: {
      email,
      name: 'Super Admin',
      password: hashedPassword,
      role: 'ADMIN',
      tier: 'PAID',
    },
  });

  console.log('\n=============================================');
  console.log('管理员账号已更新 (Admin Updated)');
  console.log('---------------------------------------------');
  console.log(`账号 (Email)   : ${email}`);
  console.log(`密码 (Password): *****  (从环境变量获取 / from environment variable)`);
  console.log('=============================================\n');
}

main()
  .catch(e => {
    console.error(e);
    (process as any).exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
