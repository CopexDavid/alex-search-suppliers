// API для сброса счетчиков КП для позиций заявки
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface ResetParams {
  params: {
    id: string
  }
}

/**
 * POST /api/requests/[id]/reset-quotes-counters
 * Сбрасывает счетчики quotesReceived для всех позиций заявки
 */
export async function POST(
  request: NextRequest,
  { params }: ResetParams
) {
  try {
    const user = await requireAuth()
    const { id: requestId } = params

    console.log(`🔄 Сброс счетчиков КП для заявки: ${requestId}`)

    // Проверяем существование заявки
    const requestData = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        positions: true
      }
    })

    if (!requestData) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      )
    }

    // Пересчитываем счетчики КП для каждой позиции
    const positions = await prisma.position.findMany({
      where: { requestId },
      select: { id: true }
    })

    let updatedCount = 0
    for (const position of positions) {
      // Считаем количество КП для этой позиции
      const quotesCount = await prisma.commercialOffer.count({
        where: {
          requestId,
          positionId: position.id,
          confidence: { gte: 70 },
          needsManualReview: false
        }
      })

      // Обновляем счетчик
      await prisma.position.update({
        where: { id: position.id },
        data: { quotesReceived: quotesCount }
      })

      updatedCount++
      console.log(`📊 Позиция ${position.id}: ${quotesCount} КП`)
    }

    // Логируем действие
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'RESET_QUOTES_COUNTERS',
        entity: 'Request',
        entityId: requestId,
        details: {
          requestNumber: requestData.requestNumber,
          positionsUpdated: updatedCount
        }
      }
    })

    console.log(`✅ Счетчики КП сброшены для ${updatedCount} позиций заявки ${requestData.requestNumber}`)

    return NextResponse.json({
      success: true,
      message: `Счетчики КП пересчитаны для ${updatedCount} позиций`,
      positionsUpdated: updatedCount
    })

  } catch (error: any) {
    console.error('❌ Ошибка сброса счетчиков КП:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

