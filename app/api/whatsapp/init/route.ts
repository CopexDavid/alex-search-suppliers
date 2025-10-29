// API для инициализации WhatsApp клиента
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import whatsappService from '@/lib/whatsapp'

/**
 * POST /api/whatsapp/init
 * Инициализирует WhatsApp клиент и начинает процесс аутентификации
 */
export async function POST() {
  try {
    await requireAuth()
    
    console.log('🚀 Starting WhatsApp initialization...')
    
    // Проверяем текущий статус
    const currentStatus = whatsappService.getStatus()
    
    if (currentStatus.status === 'ready') {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp already connected',
        status: currentStatus
      })
    }
    
    if (currentStatus.status === 'qr_ready' || currentStatus.status === 'connecting') {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp is already initializing',
        status: currentStatus
      })
    }
    
    // Инициализируем клиент (асинхронно)
    whatsappService.initialize().catch(err => {
      console.error('Error during initialization:', err)
    })
    
    // Возвращаем текущий статус
    return NextResponse.json({
      success: true,
      message: 'WhatsApp initialization started',
      status: whatsappService.getStatus()
    })
    
  } catch (error: any) {
    console.error('❌ Error initializing WhatsApp:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to initialize WhatsApp' 
      },
      { status: 500 }
    )
  }
}

