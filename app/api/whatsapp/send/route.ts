// API для отправки сообщений через WhatsApp (Whapi.Cloud)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import whapiService from '@/lib/whapi'

/**
 * POST /api/whatsapp/send
 * Отправляет текстовое сообщение через WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    
    const { phoneNumber, message } = await request.json()
    
    if (!phoneNumber || !message) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Phone number and message are required' 
        },
        { status: 400 }
      )
    }
    
    // Проверяем, готов ли клиент
    if (!whapiService.isReady()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'WhatsApp client is not ready. Please connect first.' 
        },
        { status: 503 }
      )
    }
    
    // Отправляем сообщение
    await whapiService.sendMessage(phoneNumber, message)
    
    return NextResponse.json({
      success: true,
      message: 'Message sent successfully'
    })
    
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp message:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to send message' 
      },
      { status: 500 }
    )
  }
}

