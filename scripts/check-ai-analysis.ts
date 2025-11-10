// Скрипт для проверки готовности заявок к ИИ анализу
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAIAnalysis() {
  try {
    console.log('🔍 Проверяем заявки для ИИ анализа...\n')
    
    // Получаем заявки со статусом COMPARING
    const requests = await prisma.request.findMany({
      where: {
        status: { in: ['PENDING_QUOTES', 'COMPARING'] }
      },
      include: {
        positions: {
          include: {
            positionChats: {
              include: {
                chat: {
                  include: {
                    messages: true
                  }
                }
              }
            }
          }
        },
        commercialOffers: true
      }
    })
    
    console.log(`📊 Найдено заявок со статусом PENDING_QUOTES/COMPARING: ${requests.length}\n`)
    
    for (const request of requests) {
      console.log(`📋 Заявка: ${request.requestNumber}`)
      console.log(`📊 Статус: ${request.status}`)
      console.log(`💼 Коммерческих предложений: ${request.commercialOffers.length}`)
      console.log(`📦 Позиций: ${request.positions.length}`)
      
      if (request.commercialOffers.length > 0) {
        console.log('📄 Коммерческие предложения:')
        request.commercialOffers.forEach((offer, index) => {
          console.log(`  ${index + 1}. ${offer.company} - ${offer.totalPrice} ${offer.currency} (уверенность: ${offer.confidence}%)`)
        })
      }
      
      console.log('📦 Анализ позиций:')
      for (const position of request.positions) {
        console.log(`  - ${position.name}:`)
        console.log(`    quotesReceived: ${position.quotesReceived}`)
        console.log(`    positionChats: ${position.positionChats.length}`)
        
        const chatMessages = position.positionChats.reduce((total, pc) => {
          return total + pc.chat.messages.length
        }, 0)
        console.log(`    всего сообщений в чатах: ${chatMessages}`)
        
        // Проверяем готовность к анализу
        if (position.quotesReceived >= 1) {
          console.log(`    ✅ Готова к ИИ анализу (${position.quotesReceived} КП)`)
        } else {
          console.log(`    ❌ Не готова к ИИ анализу (${position.quotesReceived} КП, нужно минимум 1)`)
        }
      }
      
      console.log('---\n')
    }
    
    // Также проверим все заявки
    const allRequests = await prisma.request.findMany({
      select: {
        requestNumber: true,
        status: true
      }
    })
    
    console.log('📋 Все заявки в системе:')
    allRequests.forEach(req => {
      console.log(`  ${req.requestNumber}: ${req.status}`)
    })
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAIAnalysis()
