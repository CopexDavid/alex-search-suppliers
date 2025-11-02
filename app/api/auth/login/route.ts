// API endpoint для входа в систему
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { verifyPassword, generateToken, createSession, logAction } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Валидация входных данных
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны' },
        { status: 400 }
      )
    }

    // Поиск пользователя
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    // Проверка активности пользователя
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Учетная запись деактивирована' },
        { status: 403 }
      )
    }

    // Проверка пароля
    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    // Генерация JWT токена
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Создание сессии в БД
    await createSession(user.id, token)

    // Логирование входа
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    await logAction(user.id, 'LOGIN', 'User', user.id, { email: user.email }, ipAddress || undefined)

    // Создаем response с данными пользователя (без пароля)
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })

    // Установка cookie через response.cookies API
    // Для HTTPS используем secure: true
    const isProduction = process.env.NODE_ENV === 'production'
    const isHttps = request.url.startsWith('https://')
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: isProduction || isHttps, // secure для production или HTTPS
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Ошибка при входе в систему' },
      { status: 500 }
    )
  }
}

