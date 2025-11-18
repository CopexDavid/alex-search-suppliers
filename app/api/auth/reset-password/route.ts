// API для сброса пароля пользователя
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * POST /api/auth/reset-password
 * Сброс пароля пользователя
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email обязателен' },
        { status: 400 }
      )
    }

    // Проверяем формат email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Неверный формат email' },
        { status: 400 }
      )
    }

    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь с таким email не найден' },
        { status: 404 }
      )
    }

    // Генерируем новый временный пароль
    const tempPassword = Math.random().toString(36).substring(2, 10)
    
    // Хешируем пароль
    const hashedPassword = await hashPassword(tempPassword)

    // Обновляем пароль пользователя
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    })

    console.log(`🔑 Пароль сброшен для пользователя: ${email}`)

    // В реальном приложении здесь нужно отправить email с новым паролем
    // Для демонстрации просто возвращаем пароль в ответе
    return NextResponse.json({
      success: true,
      message: 'Пароль успешно сброшен',
      tempPassword: tempPassword // Только для демонстрации
    })

  } catch (error: any) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Ошибка при сбросе пароля' },
      { status: 500 }
    )
  }
}