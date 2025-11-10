// Скрипт для обновления статуса заявки REQ-5113 на COMPARING
import { PrismaClient, RequestStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function updateRequestStatus() {
  try {
    console.log('🔍 Ищем заявку REQ-5113...')
    
    const request = await prisma.request.findFirst({
      where: { requestNumber: 'REQ-5113' },
      include: {
        commercialOffers: true
      }
    })
    
    if (!request) {
      console.log('❌ Заявка REQ-5113 не найдена')
      return
    }
    
    console.log(`📋 Найдена заявка: ${request.requestNumber}`)
    console.log(`📊 Текущий статус: ${request.status}`)
    console.log(`💼 Коммерческих предложений: ${request.commercialOffers.length}`)
    
    if (request.commercialOffers.length > 0) {
      console.log('📄 Коммерческие предложения:')
      request.commercialOffers.forEach((offer, index) => {
        console.log(`  ${index + 1}. ${offer.company} - ${offer.totalPrice} ${offer.currency} (уверенность: ${offer.confidence}%)`)
      })
    }
    
    if (request.status !== RequestStatus.COMPARING) {
      console.log('🔄 Обновляем статус на COMPARING...')
      
      await prisma.request.update({
        where: { id: request.id },
        data: { status: RequestStatus.COMPARING }
      })
      
      console.log('✅ Статус заявки обновлен на COMPARING')
      console.log('🎯 Теперь заявка должна появиться на странице ИИ анализа')
    } else {
      console.log('✅ Заявка уже имеет статус COMPARING')
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateRequestStatus()
