// Типы для авторизации
import { Role } from '@prisma/client'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  user: {
    id: string
    email: string
    name: string
    role: Role
  }
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  role?: Role
}

export interface AuthError {
  error: string
}

export interface SessionInfo {
  user: {
    id: string
    email: string
    name: string
    role: Role
  }
}

