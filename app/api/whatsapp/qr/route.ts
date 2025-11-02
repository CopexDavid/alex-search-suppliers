// API для получения QR кода WhatsApp
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import whapiService from '@/lib/whapi'

/**
 * GET /api/whatsapp/qr
 * Возвращает QR код для аутентификации WhatsApp
 */
export async function GET() {
  try {
    await requireAuth()
    
    // Получаем текущий статус
    let status = whapiService.getStatus()
    console.log('🔍 QR API called - Status:', status.status, 'QR Code available:', !!status.qrCode)
    
    // Если QR код не готов, пытаемся получить его
    if (status.status !== 'qr_ready' || !status.qrCode) {
      console.log('⏳ Requesting QR code from Whapi.Cloud...')
      const qrCode = await whapiService.getQRCode()
      
      if (!qrCode) {
        return NextResponse.json({
          success: false,
          error: `QR code not available. Status: ${status.status}. Please initialize WhatsApp first.`,
          status: status.status,
          hasQrCode: false
        }, { status: 400 })
      }
      
      status = whapiService.getStatus() // Обновляем статус
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
