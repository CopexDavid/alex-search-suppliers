// API для инициализации WhatsApp через Whapi.Cloud
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import whapiService from '@/lib/whapi'

/**
 * POST /api/whatsapp/init
 * Инициализирует WhatsApp инстанс через Whapi.Cloud
 */
export async function POST() {
  try {
    await requireAuth()
    
    console.log('🚀 Starting Whapi.Cloud initialization...')
    
    // Проверяем текущий статус
    const currentStatus = whapiService.getStatus()
    
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
    
    // Инициализируем инстанс
    await whapiService.initialize()
    
    // Возвращаем обновленный статус
    return NextResponse.json({
      success: true,
      message: 'Whapi.Cloud initialization completed',
      status: whapiService.getStatus()
    })
    
  } catch (error: any) {
    console.error('❌ Error initializing Whapi.Cloud:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to initialize WhatsApp' 
      },
      { status: 500 }
    )
  }
}

