import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface DecisionParams {
  params: {
    id: string
    positionId: string
  }
}

export async function POST(
  request: NextRequest,
  { params }: DecisionParams
) {
  try {
    const user = await requireAuth()
    const { id: requestId, positionId } = params
    const { supplierId, reason, aiRecommendation } = await request.json()

    console.log(`💼 Saving user decision for position ${positionId}`)

    // Получаем позицию и выбранного поставщика
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: {
        request: true,
        positionChats: {
          include: {
            chat: true
          }
        }
      }
    })

    if (!position || position.requestId !== requestId) {
      return NextResponse.json(
        { error: 'Позиция не найдена' },
        { status: 404 }
      )
    }

    // Находим выбранного поставщика
    const selectedSupplierChat = position.positionChats.find(pc => pc.chat.id === supplierId)
    if (!selectedSupplierChat) {
      return NextResponse.json(
        { error: 'Выбранный поставщик не найден' },
        { status: 404 }
      )
    }

    const supplierName = selectedSupplierChat.chat.contactName || selectedSupplierChat.chat.phoneNumber

    // Сохраняем решение пользователя
    await prisma.position.update({
      where: { id: positionId },
      data: {
        finalChoice: `Выбран: ${supplierName}${reason ? ` (${reason})` : ''}`,
        searchStatus: 'USER_DECIDED',
        updatedAt: new Date()
      }
    })

    // Обновляем статус выбранного чата
    await prisma.positionChat.update({
      where: { id: selectedSupplierChat.id },
      data: {
        status: 'SELECTED'
      }
    })

    // Обновляем статусы остальных чатов
    const otherChats = position.positionChats.filter(pc => pc.id !== selectedSupplierChat.id)
    for (const chat of otherChats) {
      await prisma.positionChat.update({
        where: { id: chat.id },
        data: {
          status: 'REJECTED'
        }
      })
    }

    // Проверяем, все ли позиции в заявке имеют решения
    const allPositions = await prisma.position.findMany({
      where: { requestId }
    })

    const allDecided = allPositions.every(p => p.searchStatus === 'USER_DECIDED')
    
    if (allDecided) {
      // Обновляем статус заявки
      await prisma.request.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          updatedAt: new Date()
        }
      })
      console.log(`✅ Request ${requestId} completed - all positions decided`)
    }

    // Создаем audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_DECISION',
        entity: 'Position',
        entityId: positionId,
        details: {
          positionName: position.name,
          selectedSupplier: supplierName,
          userReason: reason,
          aiRecommendation,
          followedAiRecommendation: aiRecommendation === supplierId,
          requestCompleted: allDecided
        }
      }
    })

    console.log(`✅ Decision saved: ${supplierName} selected for ${position.name}`)

    return NextResponse.json({
      success: true,
      message: `Поставщик "${supplierName}" выбран для позиции "${position.name}"`,
      data: {
        positionId,
        selectedSupplier: supplierName,
        requestCompleted: allDecided
      }
    })

  } catch (error: any) {
    console.error('❌ Decision Save Error:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка при сохранении решения',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
