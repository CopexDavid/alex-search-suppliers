// API для тестовой отправки сообщения через WhatsApp
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import whapiService from '@/lib/whapi'

/**
 * POST /api/whatsapp/test-send
 * Отправляет тестовое сообщение на указанный номер
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    
    const { phoneNumber, message } = await request.json()
    
    if (!phoneNumber) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Номер телефона обязателен' 
        },
        { status: 400 }
      )
    }

    const testMessage = message || `🤖 Тестовое сообщение от системы Alex\n\nВремя: ${new Date().toLocaleString('ru-RU')}\n\nЭто автоматическое сообщение для проверки интеграции с Whapi.Cloud.`
    
    console.log(`📤 Отправка тестового сообщения на ${phoneNumber}`)
    console.log(`📝 Сообщение: ${testMessage}`)
    
    // Пытаемся отправить сообщение напрямую
    // Whapi.Cloud не требует предварительной инициализации
    console.log('📤 Отправляем сообщение через Whapi.Cloud...')
    const result = await whapiService.sendMessage(phoneNumber, testMessage)
    
    if (result) {
      console.log('✅ Сообщение успешно отправлено')
      return NextResponse.json({
        success: true,
        message: 'Тестовое сообщение успешно отправлено!',
        phoneNumber,
        sentAt: new Date().toISOString()
      })
    } else {
      throw new Error('Не удалось отправить сообщение')
    }
    
  } catch (error: any) {
    console.error('❌ Ошибка отправки тестового сообщения:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Ошибка при отправке сообщения',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
