// API для получения QR кода WhatsApp
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import whatsappService from '@/lib/whatsapp'

/**
 * GET /api/whatsapp/qr
 * Возвращает QR код для аутентификации WhatsApp
 */
export async function GET() {
  try {
    await requireAuth()
    
    // Даем немного времени для синхронизации состояния
    let status = whatsappService.getStatus()
    console.log('🔍 QR API called - Status:', status.status, 'QR Code available:', !!status.qrCode)
    
    // Если статус connecting, ждем немного и проверяем снова
    if (status.status === 'connecting') {
      console.log('⏳ Status is connecting, waiting for QR generation...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      status = whatsappService.getStatus()
      console.log('🔍 QR API retry - Status:', status.status, 'QR Code available:', !!status.qrCode)
    }
    
    if (status.status !== 'qr_ready' || !status.qrCode) {
      console.log('❌ QR code not ready - Status:', status.status, 'QR Code:', status.qrCode ? 'exists' : 'null')
      return NextResponse.json({
        success: false,
        error: `QR code not available. Status: ${status.status}. Please initialize WhatsApp first.`,
        status: status.status,
        hasQrCode: !!status.qrCode
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: true,
      qrCode: status.qrCode,
      status: status.status
    })
    
  } catch (error: any) {
    console.error('❌ Error getting QR code:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get QR code' 
      },
      { status: 500 }
    )
  }
}
