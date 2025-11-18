// API для получения отчета по завершенной заявке
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface ReportParams {
  params: {
    id: string
  }
}

/**
 * GET /api/requests/[id]/report
 * Получить отчет по завершенной заявке с выбранными КП
 */
export async function GET(
  request: NextRequest,
  { params }: ReportParams
) {
  try {
    const user = await requireAuth()
    const { id: requestId } = params

    // Получаем заявку с полной информацией
    const requestData = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        positions: {
          include: {
            commercialOffers: {
              where: {
                status: 'APPROVED'
              },
              include: {
                chat: {
                  select: {
                    phoneNumber: true,
                    contactName: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        decision: {
          include: {
            decisionMaker: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!requestData) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      )
    }

    // Проверяем, что заявка завершена
    if (requestData.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Заявка не завершена. Отчет доступен только для завершенных заявок.' },
        { status: 400 }
      )
    }

    // Формируем отчет
    const report = {
      request: {
        id: requestData.id,
        requestNumber: requestData.requestNumber,
        description: requestData.description,
        createdAt: requestData.createdAt,
        deadline: requestData.deadline,
        status: requestData.status,
        creator: requestData.creator
      },
      positions: requestData.positions.map(position => {
        const selectedOffer = position.commercialOffers[0] // Выбранное КП
        return {
          id: position.id,
          name: position.name,
          description: position.description,
          quantity: position.quantity,
          unit: position.unit,
          selectedOffer: selectedOffer ? {
            id: selectedOffer.id,
            company: selectedOffer.company,
            totalPrice: selectedOffer.totalPrice,
            currency: selectedOffer.currency,
            pricePerUnit: selectedOffer.totalPrice ? selectedOffer.totalPrice / position.quantity : null,
            deliveryTerm: selectedOffer.deliveryTerm,
            paymentTerm: selectedOffer.paymentTerm,
            validUntil: selectedOffer.validUntil,
            fileName: selectedOffer.fileName,
            filePath: selectedOffer.filePath,
            createdAt: selectedOffer.createdAt,
            supplier: selectedOffer.chat ? {
              phoneNumber: selectedOffer.chat.phoneNumber,
              contactName: selectedOffer.chat.contactName
            } : null
          } : null,
          finalChoice: position.finalChoice
        }
      }),
      decision: requestData.decision ? {
        selectedSupplier: requestData.decision.selectedSupplier,
        finalPrice: requestData.decision.finalPrice,
        finalCurrency: requestData.decision.finalCurrency,
        reason: requestData.decision.reason,
        decidedBy: requestData.decision.decisionMaker,
        decidedAt: requestData.decision.createdAt
      } : null,
      summary: {
        totalPositions: requestData.positions.length,
        totalPrice: requestData.positions.reduce((sum, pos) => {
          const offer = pos.commercialOffers[0]
          return sum + (offer?.totalPrice || 0)
        }, 0),
        currency: requestData.positions[0]?.commercialOffers[0]?.currency || 'KZT',
        positionsWithOffers: requestData.positions.filter(pos => pos.commercialOffers.length > 0).length
      }
    }

    return NextResponse.json({
      success: true,
      data: report
    })

  } catch (error: any) {
    console.error('❌ Ошибка получения отчета:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

