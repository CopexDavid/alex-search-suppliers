// Утилиты для авторизации в Edge Runtime (для middleware)
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production'

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

/**
 * Проверяет JWT токен в Edge Runtime
 */
export async function verifyTokenEdge(token: string): Promise<JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
    }
  } catch (error) {
    console.error('❌ Edge token verification failed:', error instanceof Error ? error.message : error)
    return null
  }
}

