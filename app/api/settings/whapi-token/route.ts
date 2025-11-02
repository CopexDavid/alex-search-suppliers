// API для управления Whapi.Cloud токеном
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Role } from '@prisma/client'

/**
 * GET /api/settings/whapi-token
 * Получить текущий Whapi токен (замаскированный)
 */
export async function GET() {
  try {
    // Только администратор может управлять токеном
    await requireRole([Role.ADMIN])
    
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'whapi_token' }
    })
    
    if (!setting) {
      return NextResponse.json({
        success: true,
        data: {
          hasToken: false,
          maskedToken: null
        }
      })
    }
    
    // Маскируем токен для безопасности (показываем только первые и последние символы)
    const token = setting.value
    const maskedToken = token.length > 8 
      ? `${token.substring(0, 4)}${'*'.repeat(token.length - 8)}${token.substring(token.length - 4)}`
      : '*'.repeat(token.length)
    
    return NextResponse.json({
      success: true,
      data: {
        hasToken: true,
        maskedToken
      }
    })
    
  } catch (error: any) {
    console.error('❌ Error getting Whapi token:', error)
    
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка при получении токена' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/whapi-token
 * Сохранить новый Whapi токен
 */
export async function POST(request: NextRequest) {
  try {
    // Только администратор может управлять токеном
    const currentUser = await requireRole([Role.ADMIN])
    
    const body = await request.json()
    const { token } = body
    
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return NextResponse.json(
        { error: 'Токен обязателен' },
        { status: 400 }
      )
    }
    
    const trimmedToken = token.trim()
    
    // Базовая валидация токена (должен быть достаточно длинным)
    if (trimmedToken.length < 10) {
      return NextResponse.json(
        { error: 'Токен слишком короткий' },
        { status: 400 }
      )
    }
    
    // Сохраняем или обновляем токен в системных настройках
    await prisma.systemSetting.upsert({
      where: { key: 'whapi_token' },
      update: { 
        value: trimmedToken,
        updatedAt: new Date()
      },
      create: {
        key: 'whapi_token',
        value: trimmedToken,
        type: 'string'
      }
    })
    
    // Логируем действие
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'UPDATE_WHAPI_TOKEN',
        entity: 'SystemSetting',
        entityId: 'whapi_token',
        details: {
          tokenLength: trimmedToken.length,
          tokenPrefix: trimmedToken.substring(0, 4)
        },
        ipAddress: ipAddress || undefined
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Токен успешно сохранен'
    })
    
  } catch (error: any) {
    console.error('❌ Error saving Whapi token:', error)
    
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка при сохранении токена' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings/whapi-token
 * Удалить Whapi токен
 */
export async function DELETE() {
  try {
    // Только администратор может управлять токеном
    const currentUser = await requireRole([Role.ADMIN])
    
    await prisma.systemSetting.deleteMany({
      where: { key: 'whapi_token' }
    })
    
    // Логируем действие
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'DELETE_WHAPI_TOKEN',
        entity: 'SystemSetting',
        entityId: 'whapi_token',
        details: {}
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Токен успешно удален'
    })
    
  } catch (error: any) {
    console.error('❌ Error deleting Whapi token:', error)
    
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка при удалении токена' },
      { status: 500 }
    )
  }
}
