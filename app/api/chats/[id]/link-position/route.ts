// API для привязки чата к конкретной позиции
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * POST /api/chats/[id]/link-position
 * Привязать чат к конкретной позиции
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth()
    const { positionId } = await request.json()
    const chatId = params.id

    if (!positionId) {
      return NextResponse.json({ error: 'Не указан ID позиции' }, { status: 400 })
    }

    // Проверяем существование чата
    const chat = await prisma.chat.findUnique({
      where: { id: chatId }
    })

    if (!chat) {
      return NextResponse.json({ error: 'Чат не найден' }, { status: 404 })
    }

    // Проверяем существование позиции
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: {
        request: true
      }
    })

    if (!position) {
      return NextResponse.json({ error: 'Позиция не найдена' }, { status: 404 })
    }

    // Привязываем чат к заявке (если еще не привязан)
    if (!chat.requestId) {
      await prisma.chat.update({
        where: { id: chatId },
        data: {
          requestId: position.requestId
        }
      })
    }

    // Проверяем, существует ли уже связь
    const existingLink = await prisma.positionChat.findUnique({
      where: {
        positionId_chatId: {
          positionId: positionId,
          chatId: chatId
        }
      }
    })

    // Создаем или обновляем связь между позицией и чатом
    const positionChat = await prisma.positionChat.upsert({
      where: {
        positionId_chatId: {
          positionId: positionId,
          chatId: chatId
        }
      },
      create: {
        positionId: positionId,
        chatId: chatId,
        status: 'REQUESTED',
        requestSentAt: new Date()
      },
      update: {
        status: 'REQUESTED',
        requestSentAt: new Date()
      }
    })

    // Увеличиваем счетчик запрошенных КП только если связь была создана впервые
    if (!existingLink) {
    await prisma.position.update({
      where: { id: positionId },
      data: {
        quotesRequested: { increment: 1 },
        searchStatus: 'QUOTES_REQUESTED'
      }
    })
    }

    console.log(`🔗 Чат ${chatId} привязан к позиции ${positionId}`)

    return NextResponse.json({
      success: true,
      positionChat,
      position,
      chat
    })

  } catch (error: any) {
    console.error('Ошибка привязки чата к позиции:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/chats/[id]/link-position
 * Отвязать чат от позиции
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth()
    const { positionId } = await request.json()
    const chatId = params.id

    if (!positionId) {
      return NextResponse.json({ error: 'Не указан ID позиции' }, { status: 400 })
    }

    // Получаем связь чата с позицией
    const positionChat = await prisma.positionChat.findUnique({
      where: {
        positionId_chatId: {
          positionId: positionId,
          chatId: chatId
        }
      },
      include: {
        position: true
      }
    })

    if (!positionChat) {
      return NextResponse.json({ error: 'Связь чата с позицией не найдена' }, { status: 404 })
    }

    // Удаляем связь
    await prisma.positionChat.delete({
      where: {
        positionId_chatId: {
          positionId: positionId,
          chatId: chatId
        }
      }
    })

    // Уменьшаем счетчики в позиции (с защитой от отрицательных значений)
    await prisma.position.update({
      where: { id: positionId },
      data: {
        quotesRequested: Math.max(0, (positionChat.position.quotesRequested || 0) - 1),
        quotesReceived: Math.max(0, (positionChat.position.quotesReceived || 0) - 1)
      }
    })

    console.log(`🔗 Чат ${chatId} отвязан от позиции ${positionId}`)

    return NextResponse.json({
      success: true,
      message: 'Чат успешно отвязан от позиции'
    })

  } catch (error: any) {
    console.error('Ошибка отвязки чата от позиции:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}