// Скрипт для удаления связи чата с позицией
import prisma from '../lib/prisma'

async function removePositionChatLink(chatId: string, positionId: string) {
  try {
    console.log(`🔍 Удаляем связь чата ${chatId} с позицией ${positionId}\n`)

    // Проверяем существование связи
    const positionChat = await prisma.positionChat.findUnique({
      where: {
        positionId_chatId: {
          positionId,
          chatId
        }
      },
      include: {
        position: true,
        chat: true
      }
    })

    if (!positionChat) {
      console.log('❌ Связь не найдена')
      return
    }

    console.log('📋 Информация о связи:')
    console.log(`   Чат: ${positionChat.chat.phoneNumber} (${positionChat.chat.contactName || 'без имени'})`)
    console.log(`   Позиция: ${positionChat.position.name}`)
    console.log(`   Статус: ${positionChat.status}`)
    console.log()

    // Удаляем связь
    await prisma.positionChat.delete({
      where: {
        positionId_chatId: {
          positionId,
          chatId
        }
      }
    })

    console.log('✅ Связь успешно удалена')

    // Проверяем оставшиеся связи
    const remainingLinks = await prisma.positionChat.findMany({
      where: { chatId },
      include: { position: true }
    })

    console.log(`\n📊 Оставшиеся связи чата: ${remainingLinks.length}`)
    remainingLinks.forEach((link, idx) => {
      console.log(`   ${idx + 1}. ${link.position.name} (${link.positionId})`)
    })

  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Получаем параметры из аргументов командной строки
const chatId = process.argv[2]
const positionId = process.argv[3]

if (!chatId || !positionId) {
  console.log('Использование: npx tsx scripts/remove-position-chat-link.ts <chatId> <positionId>')
  console.log('Пример: npx tsx scripts/remove-position-chat-link.ts adbb1b3e-ce00-4599-bb61-26cd23aad817 6d76da56-4f32-460a-b90f-dacbc671222b')
  process.exit(1)
}

removePositionChatLink(chatId, positionId)

