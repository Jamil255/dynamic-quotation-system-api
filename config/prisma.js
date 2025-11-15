import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function testDatabaseConnection() {
  try {
    await prisma.$connect()
    console.log('MongoDB connected successfully')
    return true
  } catch (error) {
    console.error('MongoDB connection failed:', error)
    return false
  }
}

export { testDatabaseConnection }
export default prisma
