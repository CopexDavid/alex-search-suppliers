// API для привязки чата к заявке
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * POST /api/chats/[id]/link-request
 * Привязать чат к заявке
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth()
    const { requestId } = await request.json()
    const chatId = params.id

    if (!requestId) {
      return NextResponse.json({ error: 'Не указан ID заявки' }, { status: 400 })
    }

    // Проверяем существование чата
    const chat = await prisma.chat.findUnique({
      where: { id: chatId }
    })

    if (!chat) {
      return NextResponse.json({ error: 'Чат не найден' }, { status: 404 })
    }

    // Проверяем существование заявки
    const requestExists = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        positions: true
      }
    })

    if (!requestExists) {
      return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })
    }

    // Привязываем чат к заявке
    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        requestId: requestId
      }
    })

    // Создаем связи между позициями заявки и чатом
    for (const position of requestExists.positions) {
      await prisma.positionChat.upsert({
        where: {
          positionId_chatId: {
            positionId: position.id,
            chatId: chatId
          }
        },
        create: {
          positionId: position.id,
          chatId: chatId,
          status: 'REQUESTED',
          requestSentAt: new Date()
        },
        update: {
          status: 'REQUESTED',
          requestSentAt: new Date()
        }
      })

      // Увеличиваем счетчик запрошенных КП
      await prisma.position.update({
        where: { id: position.id },
        data: {
          quotesRequested: { increment: 1 },
          searchStatus: 'QUOTES_REQUESTED'
        }
      })
    }

    console.log(`🔗 Чат ${chatId} привязан к заявке ${requestExists.requestNumber}`)

    return NextResponse.json({
      success: true,
      chat: updatedChat,
      request: requestExists,
      positionsLinked: requestExists.positions.length
    })

  } catch (error: any) {
    console.error('Ошибка привязки чата к заявке:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/chats/[id]/link-request
 * Отвязать чат от заявки
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth()
    const chatId = params.id

    // Получаем чат с текущей привязкой
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        request: {
          include: {
            positions: true
          }
        }
      }
    })

    if (!chat) {
      return NextResponse.json({ error: 'Чат не найден' }, { status: 404 })
    }

    if (!chat.requestId) {
      return NextResponse.json({ error: 'Чат не привязан к заявке' }, { status: 400 })
    }

    // Удаляем связи позиций с чатом
    await prisma.positionChat.deleteMany({
      where: { chatId: chatId }
    })

    // Уменьшаем счетчики в позициях (с защитой от отрицательных значений)
    if (chat.request) {
      for (const position of chat.request.positions) {
        await prisma.position.update({
          where: { id: position.id },
          data: {
            quotesRequested: Math.max(0, (position.quotesRequested || 0) - 1),
            quotesReceived: Math.max(0, (position.quotesReceived || 0) - 1)
          }
        })
      }
    }

    // Отвязываем чат от заявки
    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        requestId: null
      }
    })

    console.log(`🔗 Чат ${chatId} отвязан от заявки ${chat.request?.requestNumber}`)

    return NextResponse.json({
      success: true,
      chat: updatedChat
    })

  } catch (error: any) {
    console.error('Ошибка отвязки чата от заявки:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}