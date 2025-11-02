// API для полной очистки сессии WhatsApp
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import whapiService from '@/lib/whapi'

/**
 * POST /api/whatsapp/clear-session
 * Полностью очищает сессию WhatsApp (отключает клиент и удаляет все данные)
 */
export async function POST() {
  try {
    await requireAuth()
    
    console.log('🗑️ Starting full WhatsApp session cleanup...')
    
    // Сначала отключаем клиент
    await whapiService.disconnect()
    console.log('✅ WhatsApp client disconnected')
    
    // Затем очищаем сессию
    await whapiService.clearSession()
    console.log('✅ Session data cleared')
    
    // Дополнительная очистка временных файлов Chrome
    try {
      const fs = require('fs')
      const path = require('path')
      const os = require('os')
      
      // Очищаем временные папки Chrome
      const tmpDir = os.tmpdir()
      const chromeProfiles = fs.readdirSync(tmpDir).filter((dir: string) => 
        dir.startsWith('whatsapp-chrome-')
      )
      
      for (const profile of chromeProfiles) {
        const profilePath = path.join(tmpDir, profile)
        try {
          fs.rmSync(profilePath, { recursive: true, force: true })
          console.log(`🗑️ Cleaned Chrome profile: ${profile}`)
        } catch (error) {
          console.log(`⚠️ Could not clean Chrome profile ${profile}:`, error.message)
        }
      }
    } catch (error) {
      console.log('⚠️ Error cleaning Chrome profiles:', error.message)
    }
    
    return NextResponse.json({
      success: true,
      message: 'WhatsApp session completely cleared. You can now initialize a fresh connection.'
    })
    
  } catch (error: any) {
    console.error('❌ Error clearing WhatsApp session:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to clear WhatsApp session' 
      },
      { status: 500 }
    )
  }
}
