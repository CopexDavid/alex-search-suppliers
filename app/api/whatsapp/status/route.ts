// API для получения статуса WhatsApp подключения
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import whatsappService from '@/lib/whatsapp'

/**
 * GET /api/whatsapp/status
 * Возвращает текущий статус WhatsApp клиента
 */
export async function GET() {
  try {
    await requireAuth()
    
    const status = whatsappService.getStatus()
    
    return NextResponse.json({
      success: true,
      status
    })
    
  } catch (error: any) {
    console.error('❌ Error getting WhatsApp status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get WhatsApp status' 
      },
      { status: 500 }
    )
  }
}

