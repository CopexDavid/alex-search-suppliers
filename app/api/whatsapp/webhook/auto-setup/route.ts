// API для автоматической настройки webhook с правильным URL
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { Role } from '@prisma/client'
import whapiService from '@/lib/whapi'

/**
 * POST /api/whatsapp/webhook/auto-setup
 * Автоматически настроить webhook с правильным URL для текущей среды
 */
export async function POST(request: NextRequest) {
  try {
    // Только администратор может настраивать webhook
    await requireRole([Role.ADMIN])
    
    // Определяем правильный URL для webhook
    let webhookUrl: string
    
    if (process.env.WHAPI_WEBHOOK_URL) {
      // Используем явно заданный URL из переменных окружения
      webhookUrl = process.env.WHAPI_WEBHOOK_URL
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      // Используем базовый URL приложения
      webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`
    } else {
      // Определяем URL из заголовков запроса (для разработки)
      const host = request.headers.get('host')
      const protocol = request.headers.get('x-forwarded-proto') || 'http'
      webhookUrl = `${protocol}://${host}/api/whatsapp/webhook`
    }
    
    console.log(`🔗 Автоматическая настройка webhook: ${webhookUrl}`)
    
    // Настраиваем webhook в Whapi.Cloud
    const result = await whapiService.setupWebhook(webhookUrl)
    
    if (result) {
      return NextResponse.json({
        success: true,
        message: 'Webhook успешно настроен автоматически',
        webhookUrl,
        environment: process.env.NODE_ENV || 'development'
      })
    } else {
      throw new Error('Не удалось настроить webhook')
    }
    
  } catch (error: any) {
    console.error('❌ Error auto-setting up webhook:', error)
    
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Ошибка при автоматической настройке webhook' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/whatsapp/webhook/auto-setup
 * Получить рекомендуемый URL для webhook
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole([Role.ADMIN])
    
    // Определяем правильный URL для webhook
    let webhookUrl: string
    let source: string
    
    if (process.env.WHAPI_WEBHOOK_URL) {
      webhookUrl = process.env.WHAPI_WEBHOOK_URL
      source = 'WHAPI_WEBHOOK_URL environment variable'
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`
      source = 'NEXT_PUBLIC_APP_URL environment variable'
    } else {
      const host = request.headers.get('host')
      const protocol = request.headers.get('x-forwarded-proto') || 'http'
      webhookUrl = `${protocol}://${host}/api/whatsapp/webhook`
      source = 'Request headers (development mode)'
    }
    
    return NextResponse.json({
      success: true,
      data: {
        recommendedUrl: webhookUrl,
        source,
        environment: process.env.NODE_ENV || 'development',
        isProduction: process.env.NODE_ENV === 'production'
      }
    })
    
  } catch (error: any) {
    console.error('❌ Error getting recommended webhook URL:', error)
    
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Ошибка при получении рекомендуемого URL' },
      { status: 500 }
    )
  }
}
