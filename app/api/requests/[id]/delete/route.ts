// API для удаления заявки с подтверждением пароля
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

interface DeleteParams {
  params: {
    id: string
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: DeleteParams
) {
  try {
    const user = await requireAuth()
    const { id } = params
    const body = await request.json()
    const { password } = body

    console.log(`🗑️ Попытка удаления заявки: ${id} пользователем ${user.email}`)

    // Проверяем пароль пользователя
    if (!password) {
      return NextResponse.json(
        { error: 'Пароль обязателен для удаления заявки' },
        { status: 400 }
      )
    }

    // Получаем пользователя с паролем
    const userWithPassword = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!userWithPassword || !userWithPassword.password) {
      return NextResponse.json(
        { error: 'Не удалось проверить пароль' },
        { status: 400 }
      )
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, userWithPassword.password)
    if (!isPasswordValid) {
      console.log(`❌ Неверный пароль для удаления заявки ${id}`)
      return NextResponse.json(
        { error: 'Неверный пароль' },
        { status: 401 }
      )
    }

    // Проверяем существование заявки
    const requestData = await prisma.request.findUnique({
      where: { id },
      include: {
        positions: true,
        commercialOffers: true,
        suppliers: true,
        chats: true,
        decision: true
      }
    })

    if (!requestData) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      )
    }

    console.log(`🗑️ Удаляем заявку ${requestData.requestNumber} со всеми связанными данными`)

    // Удаляем заявку и все связанные данные в транзакции
    await prisma.$transaction(async (tx) => {
      // 1. Удаляем решение по заявке
      if (requestData.decision) {
        await tx.requestDecision.delete({
          where: { id: requestData.decision.id }
        })
      }

      // 2. Удаляем коммерческие предложения
      if (requestData.commercialOffers.length > 0) {
        await tx.commercialOffer.deleteMany({
          where: { requestId: id }
        })
      }

      // 3. Удаляем сообщения из чатов
      for (const chat of requestData.chats) {
        await tx.chatMessage.deleteMany({
          where: { chatId: chat.id }
        })
        
        // Удаляем assistant threads
        await tx.assistantThread.deleteMany({
          where: { chatId: chat.id }
        })
      }

      // 4. Удаляем position chats
      for (const position of requestData.positions) {
        await tx.positionChat.deleteMany({
          where: { positionId: position.id }
        })
      }

      // 5. Удаляем чаты
      await tx.chat.deleteMany({
        where: { requestId: id }
      })

      // 6. Удаляем связи с поставщиками
      await tx.requestSupplier.deleteMany({
        where: { requestId: id }
      })

      // 7. Удаляем позиции
      await tx.position.deleteMany({
        where: { requestId: id }
      })

      // 8. Удаляем задачи
      await tx.task.deleteMany({
        where: { requestId: id }
      })

      // 9. Удаляем согласования
      await tx.approval.deleteMany({
        where: { requestId: id }
      })

      // 10. Удаляем котировки
      await tx.quote.deleteMany({
        where: { requestId: id }
      })

      // 11. Наконец, удаляем саму заявку
      await tx.request.delete({
        where: { id }
      })
    })

    console.log(`✅ Заявка ${requestData.requestNumber} успешно удалена`)

    return NextResponse.json({
      success: true,
      message: `Заявка ${requestData.requestNumber} успешно удалена`
    })

  } catch (error: any) {
    console.error('❌ Ошибка удаления заявки:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
