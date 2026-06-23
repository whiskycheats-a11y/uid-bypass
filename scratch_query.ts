import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);
  const user = await prisma.user.update({
    where: { email: "zytronefreefire@gmail.com" },
    data: { password: hashedPassword },
  });
  console.log("Password updated successfully for:", user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());