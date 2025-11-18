// Скрипт для проверки связей чата с позициями
import prisma from '../lib/prisma'

async function checkChatPositions(chatId: string) {
  try {
    console.log(`🔍 Проверяем чат: ${chatId}\n`)

    // Получаем чат с информацией
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        request: {
          include: {
            positions: true
          }
        },
        positionChats: {
          include: {
            position: true
          }
        },
        commercialOffers: {
          include: {
            position: true
          }
        }
      }
    })

    if (!chat) {
      console.log('❌ Чат не найден')
      return
    }

    console.log('📱 Информация о чате:')
    console.log(`   ID: ${chat.id}`)
    console.log(`   Телефон: ${chat.phoneNumber}`)
    console.log(`   Имя: ${chat.contactName || 'не указано'}`)
    console.log(`   Заявка: ${chat.requestId || 'не привязана'}`)
    if (chat.request) {
      console.log(`   Номер заявки: ${chat.request.requestNumber}`)
      console.log(`   Позиций в заявке: ${chat.request.positions.length}`)
      console.log(`   Позиции заявки:`)
      chat.request.positions.forEach((pos, idx) => {
        console.log(`     ${idx + 1}. ${pos.name} (${pos.id})`)
      })
    }
    console.log()

    console.log('🔗 Связи чата с позициями (position_chats):')
    if (chat.positionChats.length === 0) {
      console.log('   ❌ Нет связей')
    } else {
      chat.positionChats.forEach((pc, idx) => {
        console.log(`   ${idx + 1}. Позиция: ${pc.position.name}`)
        console.log(`      ID позиции: ${pc.positionId}`)
        console.log(`      Статус: ${pc.status}`)
        console.log(`      Запрос отправлен: ${pc.requestSentAt ? pc.requestSentAt.toISOString() : 'нет'}`)
        console.log(`      КП получено: ${pc.quoteReceivedAt ? pc.quoteReceivedAt.toISOString() : 'нет'}`)
        console.log(`      Создано: ${pc.createdAt.toISOString()}`)
        console.log()
      })
    }

    console.log('💼 Коммерческие предложения для этого чата:')
    if (chat.commercialOffers.length === 0) {
      console.log('   ❌ Нет КП')
    } else {
      chat.commercialOffers.forEach((co, idx) => {
        console.log(`   ${idx + 1}. КП от ${co.company || 'неизвестно'}`)
        console.log(`      ID КП: ${co.id}`)
        console.log(`      Позиция: ${co.positionId ? `${co.position?.name || 'ID: ' + co.positionId}` : 'НЕ ПРИВЯЗАНО К ПОЗИЦИИ ❌'}`)
        console.log(`      Цена: ${co.totalPrice} ${co.currency}`)
        console.log(`      Файл: ${co.fileName}`)
        console.log(`      Создано: ${co.createdAt.toISOString()}`)
        console.log()
      })
    }

    // Статистика
    console.log('📊 Статистика:')
    console.log(`   Всего связей с позициями: ${chat.positionChats.length}`)
    console.log(`   Всего КП: ${chat.commercialOffers.length}`)
    const kpWithPosition = chat.commercialOffers.filter(co => co.positionId).length
    const kpWithoutPosition = chat.commercialOffers.filter(co => !co.positionId).length
    console.log(`   КП с привязкой к позиции: ${kpWithPosition}`)
    console.log(`   КП без привязки к позиции: ${kpWithoutPosition} ${kpWithoutPosition > 0 ? '❌' : ''}`)

  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Получаем chatId из аргументов командной строки
const chatId = process.argv[2]

if (!chatId) {
  console.log('Использование: npx tsx scripts/check-chat-positions.ts <chatId>')
  console.log('Пример: npx tsx scripts/check-chat-positions.ts adbb1b3e-ce00-4599-bb61-26cd23aad817')
  process.exit(1)
}

checkChatPositions(chatId)

