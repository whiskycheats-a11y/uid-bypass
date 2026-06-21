const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const updatedUser = await prisma.user.update({
    where: { email: 'admin@uidbypass.online' },
    data: { password: hashedPassword }
  });
  console.log('Password reset successfully for:', updatedUser.email);
  console.log('New login details:');
  console.log('Email: admin@uidbypass.online');
  console.log('Password: admin123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
