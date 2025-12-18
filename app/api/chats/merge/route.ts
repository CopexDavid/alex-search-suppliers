import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizePhoneNumber } from '@/lib/utils'

// Найти дублирующиеся чаты
export async function GET(request: NextRequest) {
  try {
    // Получаем все чаты
    const allChats = await prisma.chat.findMany({
      include: {
        request: true,
        messages: {
          select: { id: true }
        },
        positionChats: true,
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Группируем по нормализованному номеру
    const phoneGroups: Record<string, typeof allChats> = {}
    
    for (const chat of allChats) {
      const normalized = normalizePhoneNumber(chat.phoneNumber)
      if (!normalized) continue
      
      if (!phoneGroups[normalized]) {
        phoneGroups[normalized] = []
      }
      phoneGroups[normalized].push(chat)
    }

    // Находим группы с дубликатами (больше 1 чата на номер)
    const duplicates = Object.entries(phoneGroups)
      .filter(([_, chats]) => chats.length > 1)
      .map(([phone, chats]) => ({
        normalizedPhone: phone,
        chats: chats.map(c => ({
          id: c.id,
          phoneNumber: c.phoneNumber,
          contactName: c.contactName,
          requestId: c.requestId,
          requestNumber: c.request?.requestNumber,
          messageCount: c._count?.messages || 0,
          positionChatsCount: c.positionChats?.length || 0,
          lastMessage: c.lastMessage,
          lastMessageAt: c.lastMessageAt,
          createdAt: c.createdAt
        }))
      }))

    return NextResponse.json({
      success: true,
      data: {
        duplicateGroups: duplicates,
        totalDuplicates: duplicates.length,
        totalChatsAffected: duplicates.reduce((sum, g) => sum + g.chats.length, 0)
      }
    })
  } catch (error) {
    console.error('Error finding duplicates:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка поиска дубликатов' },
      { status: 500 }
    )
  }
}

// Объединить чаты
export async function POST(request: NextRequest) {
  try {
    const { primaryChatId, secondaryChatIds } = await request.json()

    if (!primaryChatId || !secondaryChatIds || secondaryChatIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Укажите primaryChatId и secondaryChatIds' },
        { status: 400 }
      )
    }

    // Получаем основной чат
    const primaryChat = await prisma.chat.findUnique({
      where: { id: primaryChatId },
      include: {
        messages: true,
        positionChats: true,
        request: true
      }
    })

    if (!primaryChat) {
      return NextResponse.json(
        { success: false, error: 'Основной чат не найден' },
        { status: 404 }
      )
    }

    // Получаем вторичные чаты
    const secondaryChats = await prisma.chat.findMany({
      where: { id: { in: secondaryChatIds } },
      include: {
        messages: true,
        positionChats: true,
        request: true,
        commercialOffers: true,
        assistantThread: true
      }
    })

    let movedMessages = 0
    let movedPositionChats = 0
    let movedOffers = 0

    // Объединяем данные из каждого вторичного чата
    for (const secondaryChat of secondaryChats) {
      // 1. Переносим сообщения
      const messagesResult = await prisma.chatMessage.updateMany({
        where: { chatId: secondaryChat.id },
        data: { chatId: primaryChatId }
      })
      movedMessages += messagesResult.count

      // 2. Переносим привязки к позициям (если не дублируются)
      for (const posChat of secondaryChat.positionChats) {
        // Проверяем, нет ли уже такой привязки
        const existing = await prisma.positionChat.findFirst({
          where: {
            chatId: primaryChatId,
            positionId: posChat.positionId
          }
        })
        
        if (!existing) {
          await prisma.positionChat.update({
            where: { id: posChat.id },
            data: { chatId: primaryChatId }
          })
          movedPositionChats++
        } else {
          // Удаляем дубликат
          await prisma.positionChat.delete({
            where: { id: posChat.id }
          })
        }
      }

      // 3. Переносим коммерческие предложения
      const offersResult = await prisma.commercialOffer.updateMany({
        where: { chatId: secondaryChat.id },
        data: { chatId: primaryChatId }
      })
      movedOffers += offersResult.count

      // 4. Удаляем assistant thread (если есть)
      if (secondaryChat.assistantThread) {
        await prisma.assistantThread.delete({
          where: { id: secondaryChat.assistantThread.id }
        })
      }

      // 5. Если у основного чата нет requestId, а у вторичного есть - берём его
      if (!primaryChat.requestId && secondaryChat.requestId) {
        await prisma.chat.update({
          where: { id: primaryChatId },
          data: { requestId: secondaryChat.requestId }
        })
      }

      // 6. Удаляем вторичный чат
      await prisma.chat.delete({
        where: { id: secondaryChat.id }
      })
    }

    // Обновляем статистику основного чата
    const updatedMessages = await prisma.chatMessage.findMany({
      where: { chatId: primaryChatId },
      orderBy: { timestamp: 'desc' },
      take: 1
    })

    const messageCount = await prisma.chatMessage.count({
      where: { chatId: primaryChatId }
    })

    if (updatedMessages.length > 0) {
      await prisma.chat.update({
        where: { id: primaryChatId },
        data: {
          lastMessage: updatedMessages[0].content?.slice(0, 100),
          lastMessageAt: updatedMessages[0].timestamp
        }
      })
    }

    // Нормализуем номер телефона основного чата
    const normalizedPhone = normalizePhoneNumber(primaryChat.phoneNumber)
    if (normalizedPhone && primaryChat.phoneNumber !== normalizedPhone) {
      await prisma.chat.update({
        where: { id: primaryChatId },
        data: { phoneNumber: normalizedPhone }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        primaryChatId,
        mergedChats: secondaryChatIds.length,
        movedMessages,
        movedPositionChats,
        movedOffers,
        totalMessages: messageCount
      }
    })
  } catch (error) {
    console.error('Error merging chats:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка объединения чатов: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

// Автоматическое объединение всех дубликатов
export async function PUT(request: NextRequest) {
  try {
    // Получаем все чаты
    const allChats = await prisma.chat.findMany({
      include: {
        messages: true,
        positionChats: true,
        request: true,
        _count: { select: { messages: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Группируем по нормализованному номеру
    const phoneGroups: Record<string, typeof allChats> = {}
    
    for (const chat of allChats) {
      const normalized = normalizePhoneNumber(chat.phoneNumber)
      if (!normalized) continue
      
      if (!phoneGroups[normalized]) {
        phoneGroups[normalized] = []
      }
      phoneGroups[normalized].push(chat)
    }

    // Находим группы с дубликатами
    const duplicateGroups = Object.entries(phoneGroups)
      .filter(([_, chats]) => chats.length > 1)

    let totalMerged = 0
    let totalMessages = 0
    let totalPositionChats = 0

    for (const [phone, chats] of duplicateGroups) {
      // Выбираем "главный" чат - тот который имеет requestId или больше сообщений
      const sortedChats = [...chats].sort((a, b) => {
        // Приоритет: requestId > количество сообщений > дата создания
        if (a.requestId && !b.requestId) return -1
        if (!a.requestId && b.requestId) return 1
        if ((a._count?.messages || 0) !== (b._count?.messages || 0)) {
          return (b._count?.messages || 0) - (a._count?.messages || 0)
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })

      const primaryChat = sortedChats[0]
      const secondaryChats = sortedChats.slice(1)

      for (const secondaryChat of secondaryChats) {
        // Переносим сообщения
        const msgResult = await prisma.chatMessage.updateMany({
          where: { chatId: secondaryChat.id },
          data: { chatId: primaryChat.id }
        })
        totalMessages += msgResult.count

        // Переносим привязки к позициям
        for (const posChat of secondaryChat.positionChats) {
          const existing = await prisma.positionChat.findFirst({
            where: {
              chatId: primaryChat.id,
              positionId: posChat.positionId
            }
          })
          
          if (!existing) {
            await prisma.positionChat.update({
              where: { id: posChat.id },
              data: { chatId: primaryChat.id }
            })
            totalPositionChats++
          } else {
            await prisma.positionChat.delete({ where: { id: posChat.id } })
          }
        }

        // Переносим КП
        await prisma.commercialOffer.updateMany({
          where: { chatId: secondaryChat.id },
          data: { chatId: primaryChat.id }
        })

        // Если у основного нет requestId - берём от вторичного
        if (!primaryChat.requestId && secondaryChat.requestId) {
          await prisma.chat.update({
            where: { id: primaryChat.id },
            data: { requestId: secondaryChat.requestId }
          })
        }

        // Удаляем assistantThread если есть
        await prisma.assistantThread.deleteMany({
          where: { chatId: secondaryChat.id }
        })

        // Удаляем вторичный чат
        await prisma.chat.delete({
          where: { id: secondaryChat.id }
        })

        totalMerged++
      }

      // Обновляем основной чат
      const lastMsg = await prisma.chatMessage.findFirst({
        where: { chatId: primaryChat.id },
        orderBy: { timestamp: 'desc' }
      })

      const normalizedPhone = normalizePhoneNumber(primaryChat.phoneNumber)

      await prisma.chat.update({
        where: { id: primaryChat.id },
        data: {
          phoneNumber: normalizedPhone || primaryChat.phoneNumber,
          lastMessage: lastMsg?.content?.slice(0, 100),
          lastMessageAt: lastMsg?.timestamp
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        duplicateGroupsProcessed: duplicateGroups.length,
        totalChatsMerged: totalMerged,
        totalMessagesMoved: totalMessages,
        totalPositionChatsMoved: totalPositionChats
      }
    })
  } catch (error) {
    console.error('Error auto-merging chats:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка автоматического объединения: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
