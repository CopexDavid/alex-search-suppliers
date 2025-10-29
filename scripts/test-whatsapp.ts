#!/usr/bin/env tsx

/**
 * Тестовый скрипт для проверки работы WhatsApp Web JS
 */

import whatsappService from '../lib/whatsapp'

async function testWhatsApp() {
  console.log('🚀 Тестирование WhatsApp Web JS...')
  
  try {
    // Проверяем текущий статус
    console.log('📊 Текущий статус:', whatsappService.getStatus())
    
    // Инициализируем клиент
    console.log('🔄 Инициализация клиента...')
    await whatsappService.initialize()
    
    // Ждем готовности или QR кода
    let attempts = 0
    const maxAttempts = 30 // 30 секунд
    
    while (attempts < maxAttempts) {
      const status = whatsappService.getStatus()
      console.log(`📊 Статус (попытка ${attempts + 1}):`, status.status)
      
      if (status.status === 'ready') {
        console.log('✅ WhatsApp готов к работе!')
        console.log('📱 Номер телефона:', status.phoneNumber)
        break
      } else if (status.status === 'qr_ready') {
        console.log('📱 QR код готов для сканирования')
        console.log('🔗 QR код доступен через API: /api/whatsapp/qr')
        break
      } else if (status.status === 'error') {
        console.error('❌ Ошибка:', status.error)
        break
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
    }
    
    if (attempts >= maxAttempts) {
      console.log('⏰ Таймаут ожидания инициализации')
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error)
  }
}

// Запускаем тест
testWhatsApp().then(() => {
  console.log('✅ Тест завершен')
}).catch(error => {
  console.error('❌ Ошибка теста:', error)
  process.exit(1)
})
