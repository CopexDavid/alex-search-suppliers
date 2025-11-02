// API endpoint для выхода из системы
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { deleteSession, getCurrentUser, logAction } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const cookieStore = cookies()
    const token = cookieStore.get('auth_token')?.value

    // Удаление сессии из БД
    if (token) {
      await deleteSession(token)
    }

    // Логирование выхода
    if (user) {
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      await logAction(user.id, 'LOGOUT', 'User', user.id, { email: user.email }, ipAddress || undefined)
    }

    // Создаем response и удаляем cookie
    const response = NextResponse.json({ success: true })
    response.cookies.delete('auth_token')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Ошибка при выходе из системы' },
      { status: 500 }
    )
  }
}

