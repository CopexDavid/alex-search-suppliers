// Скрипт для обновления счетчика КП для заявки REQ-5113
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateQuotesCounter() {
  try {
    console.log('🔍 Обновляем счетчик КП для заявки REQ-5113...')
    
    const request = await prisma.request.findFirst({
      where: { requestNumber: 'REQ-5113' },
      include: {
        commercialOffers: true,
        positions: true
      }
    })
    
    if (!request) {
      console.log('❌ Заявка REQ-5113 не найдена')
      return
    }
    
    // Считаем качественные КП
    const quotesCount = await prisma.commercialOffer.count({
      where: { 
        requestId: request.id,
        confidence: { gte: 70 },
        needsManualReview: false
      }
    })
    
    console.log(`📊 Найдено качественных КП: ${quotesCount}`)
    
    // Обновляем все позиции
    const updatedPositions = await prisma.position.updateMany({
      where: { requestId: request.id },
      data: { quotesReceived: quotesCount }
    })
    
    console.log(`✅ Обновлено позиций: ${updatedPositions.count}`)
    
    // Проверяем результат
    const positions = await prisma.position.findMany({
      where: { requestId: request.id },
      select: { name: true, quotesReceived: true }
    })
    
    console.log('📦 Позиции после обновления:')
    positions.forEach(pos => {
      console.log(`  - ${pos.name}: ${pos.quotesReceived} КП`)
    })
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateQuotesCounter()
