// API для выбора КП для конкретной позиции
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { RequestStatus, CommercialOfferStatus } from '@prisma/client'

interface SelectOfferParams {
  params: {
    id: string
    positionId: string
  }
}

/**
 * POST /api/requests/[id]/positions/[positionId]/select-offer
 * Выбирает КП для конкретной позиции
 */
export async function POST(
  request: NextRequest,
  { params }: SelectOfferParams
) {
  try {
    const user = await requireAuth()
    const { id: requestId, positionId } = params
    const body = await request.json()
    
    const { offerId, reason } = body

    if (!offerId || !reason) {
      return NextResponse.json(
        { error: 'Не указано выбранное предложение или обоснование' },
        { status: 400 }
      )
    }

    console.log(`🎯 Выбор КП для позиции ${positionId}: ${offerId}`)

    // Проверяем существование заявки, позиции и КП
    const [requestData, position, selectedOffer] = await Promise.all([
      prisma.request.findUnique({
        where: { id: requestId },
        include: {
          positions: {
            include: {
              commercialOffers: {
                where: {
                  status: CommercialOfferStatus.APPROVED
                }
              }
            }
          }
        }
      }),
      prisma.position.findUnique({
        where: { id: positionId }
      }),
      prisma.commercialOffer.findUnique({
        where: { id: offerId }
      })
    ])

    if (!requestData) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      )
    }

    if (!position || position.requestId !== requestId) {
      return NextResponse.json(
        { error: 'Позиция не найдена' },
        { status: 404 }
      )
    }

    if (!selectedOffer || selectedOffer.requestId !== requestId) {
      return NextResponse.json(
        { error: 'Выбранное коммерческое предложение не найдено' },
        { status: 404 }
      )
    }
    
    // Если КП не привязано к позиции - привязываем
    if (!selectedOffer.positionId || selectedOffer.positionId !== positionId) {
      console.log(`📎 Привязываем КП ${offerId} к позиции ${positionId}`)
      await prisma.commercialOffer.update({
        where: { id: offerId },
        data: { positionId: positionId }
      })
    }

    // Выполняем выбор в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // 1. Обновляем статус выбранного КП на APPROVED
      await tx.commercialOffer.update({
        where: { id: offerId },
        data: { 
          status: CommercialOfferStatus.APPROVED,
          reviewedBy: user.id,
          reviewedAt: new Date()
        }
      })

      // 2. Обновляем статус остальных КП для этой позиции на REJECTED
      await tx.commercialOffer.updateMany({
        where: {
          requestId: requestId,
          positionId: positionId,
          id: { not: offerId }
        },
        data: { 
          status: CommercialOfferStatus.REJECTED,
          reviewedBy: user.id,
          reviewedAt: new Date()
        }
      })

      // 3. Сохраняем выбор в позиции
      await tx.position.update({
        where: { id: positionId },
        data: {
          finalChoice: `Выбран: ${selectedOffer.company} (${selectedOffer.totalPrice} ${selectedOffer.currency})${reason ? ` - ${reason}` : ''}`,
          searchStatus: 'USER_DECIDED',
          updatedAt: new Date()
        }
      })

      // 4. Проверяем, все ли позиции имеют выбранные КП
      const allPositions = await tx.position.findMany({
        where: { requestId },
        include: {
          commercialOffers: {
            where: {
              status: CommercialOfferStatus.APPROVED
            }
          }
        }
      })

      const allPositionsCompleted = allPositions.every(pos => 
        pos.commercialOffers.length > 0 || pos.searchStatus === 'USER_DECIDED'
      )

      // 5. Если все позиции завершены, завершаем заявку
      if (allPositionsCompleted) {
        // Создаем запись о принятом решении для заявки
        await tx.requestDecision.upsert({
          where: { requestId },
          create: {
            requestId: requestId,
            selectedOfferId: offerId, // Используем последний выбранный КП
            decidedBy: user.id,
            reason: `Все позиции завершены. ${reason}`,
            finalPrice: selectedOffer.totalPrice,
            finalCurrency: selectedOffer.currency,
            selectedSupplier: selectedOffer.company,
            createdAt: new Date()
          },
          update: {
            selectedOfferId: offerId,
            decidedBy: user.id,
            reason: `Все позиции завершены. ${reason}`,
            finalPrice: selectedOffer.totalPrice,
            finalCurrency: selectedOffer.currency,
            selectedSupplier: selectedOffer.company
          }
        })

        // Обновляем статус заявки на COMPLETED
        await tx.request.update({
          where: { id: requestId },
          data: { 
            status: RequestStatus.COMPLETED,
            updatedAt: new Date()
          }
        })
      }

      // 6. Логируем действие
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'POSITION_OFFER_SELECTED',
          entity: 'Position',
          entityId: positionId,
          details: {
            requestNumber: requestData.requestNumber,
            positionName: position.name,
            selectedSupplier: selectedOffer.company,
            finalPrice: selectedOffer.totalPrice,
            currency: selectedOffer.currency,
            reason: reason,
            allPositionsCompleted
          }
        }
      })

      return { allPositionsCompleted }
    })

    console.log(`✅ КП выбрано для позиции ${position.name}`)
    if (result.allPositionsCompleted) {
      console.log(`🎉 Все позиции завершены, заявка ${requestData.requestNumber} завершена`)
    }

    return NextResponse.json({
      success: true,
      message: 'КП успешно выбрано для позиции',
      allPositionsCompleted: result.allPositionsCompleted,
      position: {
        id: position.id,
        name: position.name
      }
    })

  } catch (error: any) {
    console.error('❌ Ошибка выбора КП для позиции:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

