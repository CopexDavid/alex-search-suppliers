// API для настройки webhook Whapi.Cloud
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { Role } from '@prisma/client'
import whapiService from '@/lib/whapi'

/**
 * POST /api/whatsapp/webhook/setup
 * Настроить webhook для получения входящих сообщений
 */
export async function POST(request: NextRequest) {
  try {
    // Только администратор может настраивать webhook
    await requireRole([Role.ADMIN])
    
    const { webhookUrl } = await request.json()
    
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'URL webhook обязателен' },
        { status: 400 }
      )
    }
    
    // Проверяем, что URL валидный
    try {
      new URL(webhookUrl)
    } catch {
      return NextResponse.json(
        { error: 'Неверный формат URL' },
        { status: 400 }
      )
    }
    
    console.log(`🔗 Настраиваем webhook: ${webhookUrl}`)
    
    // Настраиваем webhook в Whapi.Cloud
    const result = await whapiService.setupWebhook(webhookUrl)
    
    if (result) {
      return NextResponse.json({
        success: true,
        message: 'Webhook успешно настроен',
        webhookUrl
      })
    } else {
      throw new Error('Не удалось настроить webhook')
    }
    
  } catch (error: any) {
    console.error('❌ Error setting up webhook:', error)
    
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Ошибка при настройке webhook' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/whatsapp/webhook/setup
 * Получить текущие настройки webhook
 */
export async function GET() {
  try {
    await requireRole([Role.ADMIN])
    
    const settings = await whapiService.getSettings()
    
    return NextResponse.json({
      success: true,
      data: {
        webhook: settings?.webhook || null,
        settings: settings
      }
    })
    
  } catch (error: any) {
    console.error('❌ Error getting webhook settings:', error)
    
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Ошибка при получении настроек webhook' },
      { status: 500 }
    )
  }
}
