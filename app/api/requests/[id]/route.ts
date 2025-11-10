// API для получения конкретной заявки
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface RequestParams {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RequestParams
) {
  try {
    const user = await requireAuth()
    const { id } = params

    console.log(`🔍 Загружаем заявку: ${id}`)

    // Получаем заявку с полной информацией
    const requestData = await prisma.request.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        positions: {
          include: {
            positionChats: {
              include: {
                chat: {
                  include: {
                    messages: {
                      orderBy: { timestamp: 'desc' },
                      take: 10
                    }
                  }
                }
              }
            }
          }
        },
        commercialOffers: {
          where: {
            confidence: { gte: 70 },
            needsManualReview: false
          },
          orderBy: { totalPrice: 'asc' } // Сортируем по цене
        },
        suppliers: {
          include: {
            supplier: true
          }
        },
        _count: {
          select: {
            quotes: true,
            suppliers: true,
          },
        },
      }
    })

    if (!requestData) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      )
    }

    console.log(`✅ Заявка загружена: ${requestData.requestNumber}`)
    console.log(`📊 КП: ${requestData.commercialOffers.length}, Позиций: ${requestData.positions.length}`)

    return NextResponse.json({
      success: true,
      data: requestData
    })

  } catch (error: any) {
    console.error('❌ Ошибка загрузки заявки:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// PUT /api/requests/[id] - Обновить заявку
export async function PUT(
  request: NextRequest,
  { params }: RequestParams
) {
  try {
    const user = await requireAuth()
    const { id } = params
    const body = await request.json()

    const {
      requestNumber,
      description,
      deadline,
      budget,
      currency,
      priority,
      status,
      searchRegion,
      positions,
    } = body

    console.log(`🔄 Обновляем заявку: ${id}`)

    // Проверяем существование заявки
    const existingRequest = await prisma.request.findUnique({
      where: { id },
      include: { positions: true }
    })

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      )
    }

    // Обновляем заявку в транзакции
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // 1. Обновляем основные данные заявки
      const updated = await tx.request.update({
        where: { id },
        data: {
          requestNumber,
          description,
          deadline: new Date(deadline),
          budget,
          currency,
          priority,
          status,
          searchRegion,
          updatedAt: new Date()
        }
      })

      // 2. Удаляем старые позиции
      await tx.position.deleteMany({
        where: { requestId: id }
      })

      // 3. Создаем новые позиции
      if (positions && positions.length > 0) {
        await tx.position.createMany({
          data: positions.map((pos: any) => ({
            requestId: id,
            sku: pos.sku || '',
            name: pos.name,
            description: pos.description,
            quantity: pos.quantity,
            unit: pos.unit,
          }))
        })
      }

      return updated
    })

    // Получаем обновленную заявку с позициями
    const finalRequest = await prisma.request.findUnique({
      where: { id },
      include: {
        positions: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        commercialOffers: true,
        suppliers: {
          include: {
            supplier: true
          }
        },
      }
    })

    console.log(`✅ Заявка обновлена: ${finalRequest?.requestNumber}`)

    return NextResponse.json({
      success: true,
      data: finalRequest
    })

  } catch (error: any) {
    console.error('❌ Ошибка обновления заявки:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}