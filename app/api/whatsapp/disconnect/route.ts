// API для отключения WhatsApp клиента
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import whapiService from '@/lib/whapi'

/**
 * POST /api/whatsapp/disconnect
 * Отключает WhatsApp клиент и опционально удаляет сессию
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
    
    const body = await request.json().catch(() => ({}))
    const clearSession = body.clearSession === true
    
    console.log('🔌 Disconnecting WhatsApp...')
    
    await whapiService.disconnect()
    
    if (clearSession) {
      console.log('🗑️ Clearing session data...')
      await whapiService.clearSession()
    }
    
    return NextResponse.json({
      success: true,
      message: clearSession 
        ? 'WhatsApp disconnected and session cleared successfully'
        : 'WhatsApp disconnected successfully'
    })
    
  } catch (error: any) {
    console.error('❌ Error disconnecting WhatsApp:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to disconnect WhatsApp' 
      },
      { status: 500 }
    )
  }
}

