// API для тестирования webhook входящих сообщений
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

/**
 * POST /api/whatsapp/webhook/test
 * Тестирование webhook с симуляцией входящего сообщения
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    
    const {
      phoneNumber = "77777777777",
      message = "Тестовое сообщение",
      messageType = "text"
    } = body
    
    // Создаем тестовые данные в формате Whapi.Cloud
    const testWebhookData = {
      type: "message",
      data: {
        id: `test_${Date.now()}`,
        from: `${phoneNumber}@c.us`,
        body: message,
        timestamp: Math.floor(Date.now() / 1000),
        type: messageType,
        chat_id: `${phoneNumber}@c.us`
      }
    }
    
    console.log('🧪 Отправляем тестовый webhook:', JSON.stringify(testWebhookData, null, 2))
    
    // Отправляем запрос на наш собственный webhook
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://alexautozakup.kz'
    const webhookUrl = `${baseUrl}/api/whatsapp/webhook`
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testWebhookData)
    })
    
    const responseData = await response.json()
    
    return NextResponse.json({
      success: true,
      message: 'Тестовый webhook отправлен',
      data: {
        testData: testWebhookData,
        webhookResponse: responseData,
        webhookStatus: response.status
      }
    })
    
  } catch (error: any) {
    console.error('❌ Error testing webhook:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка при тестировании webhook' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/whatsapp/webhook/test
 * Получение информации о webhook для тестирования
 */
export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://alexautozakup.kz'
    const webhookUrl = `${baseUrl}/api/whatsapp/webhook`
    
    // Проверяем доступность webhook
    const response = await fetch(webhookUrl, {
      method: 'GET'
    })
    
    const webhookData = await response.json()
    
    return NextResponse.json({
      success: true,
      data: {
        webhookUrl,
        webhookStatus: response.status,
        webhookResponse: webhookData,
        testInstructions: {
          method: 'POST',
          url: '/api/whatsapp/webhook/test',
          body: {
            phoneNumber: '77777777777',
            message: 'Тестовое сообщение',
            messageType: 'text'
          }
        }
      }
    })
    
  } catch (error: any) {
    console.error('❌ Error checking webhook:', error)
    
    return NextResponse.json(
      { error: 'Ошибка при проверке webhook' },
      { status: 500 }
    )
  }
}
