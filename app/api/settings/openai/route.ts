// API для управления настройками OpenAI
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Role } from '../../../../lib/rbac'

/**
 * GET /api/settings/openai
 * Получить текущие настройки OpenAI (замаскированные)
 */
export async function GET() {
  try {
    // Только администратор может управлять настройками ИИ
    await requireRole([Role.ADMIN])
    
    const [apiKeySetting, assistantIdSetting] = await Promise.all([
      prisma.systemSetting.findUnique({
        where: { key: 'openai_api_key' }
      }),
      prisma.systemSetting.findUnique({
        where: { key: 'openai_assistant_id' }
      })
    ])
    
    const hasApiKey = !!apiKeySetting?.value
    const maskedApiKey = hasApiKey && apiKeySetting?.value 
      ? `${apiKeySetting.value.substring(0, 7)}${'*'.repeat(20)}${apiKeySetting.value.substring(apiKeySetting.value.length - 4)}`
      : null
    
    return NextResponse.json({
      success: true,
      data: {
        hasApiKey,
        maskedApiKey,
        assistantId: assistantIdSetting?.value || null
      }
    })
    
  } catch (error: any) {
    console.error('❌ Error getting OpenAI settings:', error)
    
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка при получении настроек OpenAI' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/openai
 * Сохранить настройки OpenAI
 */
export async function POST(request: NextRequest) {
  try {
    // Только администратор может управлять настройками ИИ
    const currentUser = await requireRole([Role.ADMIN])
    
    const body = await request.json()
    const { apiKey, assistantId } = body
    
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: 'API ключ OpenAI обязателен' },
        { status: 400 }
      )
    }
    
    if (!assistantId || typeof assistantId !== 'string' || assistantId.trim().length === 0) {
      return NextResponse.json(
        { error: 'ID ассистента OpenAI обязателен' },
        { status: 400 }
      )
    }
    
    const trimmedApiKey = apiKey.trim()
    const trimmedAssistantId = assistantId.trim()
    
    // Базовая валидация API ключа
    if (!trimmedApiKey.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'Неверный формат API ключа OpenAI' },
        { status: 400 }
      )
    }
    
    // Базовая валидация ID ассистента
    if (!trimmedAssistantId.startsWith('asst_')) {
      return NextResponse.json(
        { error: 'Неверный формат ID ассистента OpenAI' },
        { status: 400 }
      )
    }
    
    // Сохраняем или обновляем настройки в системных настройках
    await Promise.all([
      prisma.systemSetting.upsert({
        where: { key: 'openai_api_key' },
        update: { 
          value: trimmedApiKey,
          updatedAt: new Date()
        },
        create: {
          key: 'openai_api_key',
          value: trimmedApiKey,
          type: 'string'
        }
      }),
      prisma.systemSetting.upsert({
        where: { key: 'openai_assistant_id' },
        update: { 
          value: trimmedAssistantId,
          updatedAt: new Date()
        },
        create: {
          key: 'openai_assistant_id',
          value: trimmedAssistantId,
          type: 'string'
        }
      })
    ])
    
    // Логируем действие
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'UPDATE_OPENAI_SETTINGS',
        entity: 'SystemSetting',
        entityId: 'openai_settings',
        details: {
          apiKeyLength: trimmedApiKey.length,
          apiKeyPrefix: trimmedApiKey.substring(0, 7),
          assistantId: trimmedAssistantId
        },
        ipAddress: ipAddress || undefined
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Настройки OpenAI успешно сохранены'
    })
    
  } catch (error: any) {
    console.error('❌ Error saving OpenAI settings:', error)
    
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка при сохранении настроек OpenAI' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings/openai
 * Удалить настройки OpenAI
 */
export async function DELETE() {
  try {
    // Только администратор может управлять настройками ИИ
    const currentUser = await requireRole([Role.ADMIN])
    
    await Promise.all([
      prisma.systemSetting.deleteMany({
        where: { key: 'openai_api_key' }
      }),
      prisma.systemSetting.deleteMany({
        where: { key: 'openai_assistant_id' }
      })
    ])
    
    // Логируем действие
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'DELETE_OPENAI_SETTINGS',
        entity: 'SystemSetting',
        entityId: 'openai_settings',
        details: {}
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Настройки OpenAI успешно удалены'
    })
    
  } catch (error: any) {
    console.error('❌ Error deleting OpenAI settings:', error)
    
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка при удалении настроек OpenAI' },
      { status: 500 }
    )
  }
}
