// API для финализации выбора поставщика и завершения заявки
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { RequestStatus } from '@prisma/client'

interface FinalizeParams {
  params: {
    id: string
  }
}

export async function POST(
  request: NextRequest,
  { params }: FinalizeParams
) {
  try {
    const user = await requireAuth()
    const { id: requestId } = params
    const body = await request.json()
    
    const { selectedOfferId, reason } = body

    if (!selectedOfferId || !reason) {
      return NextResponse.json(
        { error: 'Не указано выбранное предложение или обоснование' },
        { status: 400 }
      )
    }

    console.log(`🎯 Финализация заявки ${requestId}: выбрано КП ${selectedOfferId}`)

    // Проверяем существование заявки и КП
    const [requestData, selectedOffer] = await Promise.all([
      prisma.request.findUnique({
        where: { id: requestId },
        include: {
          positions: true,
          commercialOffers: true
        }
      }),
      prisma.commercialOffer.findUnique({
        where: { id: selectedOfferId }
      })
    ])

    if (!requestData) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      )
    }

    if (!selectedOffer || selectedOffer.requestId !== requestId) {
      return NextResponse.json(
        { error: 'Выбранное коммерческое предложение не найдено' },
        { status: 404 }
      )
    }

    // Выполняем финализацию в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // 1. Обновляем статус заявки на COMPLETED
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: { 
          status: RequestStatus.COMPLETED,
          updatedAt: new Date()
        }
      })

      // 2. Создаем запись о принятом решении
      const decision = await tx.requestDecision.create({
        data: {
          requestId: requestId,
          selectedOfferId: selectedOfferId,
          decidedBy: user.id,
          reason: reason,
          finalPrice: selectedOffer.totalPrice,
          finalCurrency: selectedOffer.currency,
          selectedSupplier: selectedOffer.company,
          createdAt: new Date()
        }
      })

      // 3. Обновляем статус выбранного КП на APPROVED
      await tx.commercialOffer.update({
        where: { id: selectedOfferId },
        data: { 
          status: 'APPROVED',
          reviewedBy: user.id,
          reviewedAt: new Date()
        }
      })

      // 4. Обновляем статус остальных КП на REJECTED
      await tx.commercialOffer.updateMany({
        where: {
          requestId: requestId,
          id: { not: selectedOfferId }
        },
        data: { 
          status: 'REJECTED',
          reviewedBy: user.id,
          reviewedAt: new Date()
        }
      })

      // 5. Логируем действие
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'REQUEST_FINALIZED',
          entity: 'Request',
          entityId: requestId,
          details: {
            requestNumber: requestData.requestNumber,
            selectedSupplier: selectedOffer.company,
            finalPrice: selectedOffer.totalPrice,
            currency: selectedOffer.currency,
            reason: reason,
            totalOffers: requestData.commercialOffers.length
          }
        }
      })

      return { updatedRequest, decision }
    })

    console.log(`✅ Заявка ${requestData.requestNumber} завершена`)
    console.log(`🏆 Выбран поставщик: ${selectedOffer.company}`)
    console.log(`💰 Итоговая цена: ${selectedOffer.totalPrice} ${selectedOffer.currency}`)

    return NextResponse.json({
      success: true,
      message: 'Заявка успешно завершена',
      decision: {
        requestNumber: requestData.requestNumber,
        selectedSupplier: selectedOffer.company,
        finalPrice: selectedOffer.totalPrice,
        currency: selectedOffer.currency,
        decidedBy: user.name,
        decidedAt: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('❌ Ошибка финализации заявки:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
