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

    // Привязываем чат к заявке (БЕЗ автоматического создания связей с позициями)
    // Связи с позициями должны создаваться отдельно через link-position для выбранных позиций
    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        requestId: requestId
      }
    })

    console.log(`🔗 Чат ${chatId} привязан к заявке ${requestExists.requestNumber}`)
    console.log(`ℹ️  Для привязки к конкретным позициям используйте API link-position`)

    return NextResponse.json({
      success: true,
      chat: updatedChat,
      request: requestExists,
      message: 'Чат привязан к заявке. Используйте link-position для привязки к конкретным позициям.'
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