// API для управления пользователями
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hashPassword, logAction, requireRole } from '@/lib/auth'
import { Role } from '../../../lib/rbac'

// GET /api/users - получить список пользователей
export async function GET(request: NextRequest) {
  try {
    // Только администратор может просматривать пользователей
    const currentUser = await requireRole([Role.ADMIN])

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Добавляем информацию о последнем входе
    const usersWithLastLogin = users.map(user => ({
      ...user,
      lastLogin: user.sessions[0]?.createdAt || null,
      sessions: undefined, // убираем sessions из ответа
    }))

    return NextResponse.json({
      success: true,
      data: usersWithLastLogin,
    })
  } catch (error: any) {
    console.error('Get users error:', error)

    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при получении списка пользователей' },
      { status: 500 }
    )
  }
}

// POST /api/users - создать нового пользователя
export async function POST(request: NextRequest) {
  try {
    // Только администратор может создавать пользователей
    const currentUser = await requireRole([Role.ADMIN])

    const body = await request.json()
    const { email, password, name, role, isActive = true } = body

    // Валидация входных данных
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, пароль и имя обязательны' },
        { status: 400 }
      )
    }

    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Неверный формат email' },
        { status: 400 }
      )
    }

    // Проверка длины пароля
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      )
    }

    // Проверка валидности роли
    if (role && !Object.values(Role).includes(role)) {
      return NextResponse.json(
        { error: 'Неверная роль пользователя' },
        { status: 400 }
      )
    }

    // Проверка существующего пользователя
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 409 }
      )
    }

    // Хеширование пароля
    const hashedPassword = await hashPassword(password)

    // Создание пользователя
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: role || Role.VIEWER,
        isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    // Логирование создания пользователя
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    await logAction(
      currentUser.id,
      'create_user',
      'user',
      user.id,
      { email: user.email, role: user.role },
      ipAddress || undefined
    )

    return NextResponse.json(
      {
        success: true,
        data: user,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Create user error:', error)

    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при создании пользователя' },
      { status: 500 }
    )
  }
}
