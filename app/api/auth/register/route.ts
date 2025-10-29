// API endpoint для регистрации нового пользователя
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hashPassword, logAction, requireRole } from '@/lib/auth'
import { Role } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    // Только администратор может создавать пользователей
    const currentUser = await requireRole([Role.ADMIN])

    const body = await request.json()
    const { email, password, name, role } = body

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
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
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
        user,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Registration error:', error)

    // Если пользователь не авторизован или не имеет прав
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

