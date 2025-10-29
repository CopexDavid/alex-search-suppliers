// Утилиты для аутентификации и работы с JWT
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import prisma from './prisma'
import { User, Role } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export interface JWTPayload {
  userId: string
  email: string
  role: Role
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
}

/**
 * Генерирует JWT токен для пользователя
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * Проверяет и декодирует JWT токен
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    console.error('Token verification failed:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Хеширует пароль
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * Проверяет пароль
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Получает текущего пользователя из cookies
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return null
    }

    const payload = verifyToken(token)
    if (!payload) {
      return null
    }

    // Проверяем, существует ли пользователь и активен ли он
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    })

    if (!user || !user.isActive) {
      return null
    }

    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Требует авторизацию - выбрасывает ошибку если пользователь не авторизован
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Проверяет, имеет ли пользователь указанную роль
 */
export function hasRole(user: AuthUser, roles: Role[]): boolean {
  return roles.includes(user.role)
}

/**
 * Требует определенную роль
 */
export async function requireRole(roles: Role[]): Promise<AuthUser> {
  const user = await requireAuth()
  if (!hasRole(user, roles)) {
    throw new Error('Forbidden')
  }
  return user
}

/**
 * Создает сессию для пользователя
 */
export async function createSession(userId: string, token: string): Promise<void> {
  // Токен действителен 7 дней
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  })
}

/**
 * Удаляет сессию
 */
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token },
  })
}

/**
 * Очищает просроченные сессии
 */
export async function cleanupExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  })
}

/**
 * Логирует действие пользователя
 */
export async function logAction(
  userId: string | null,
  action: string,
  entity?: string,
  entityId?: string,
  details?: any,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details,
        ipAddress,
      },
    })
  } catch (error) {
    console.error('Error logging action:', error)
  }
}

