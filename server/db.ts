import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

// Initialize Prisma Client
const prisma = new PrismaClient();

export default prisma;

// Connection test function
export async function testConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Database connection successful');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

// Cleanup function
export async function disconnectPrisma() {
  await prisma.$disconnect();
}
