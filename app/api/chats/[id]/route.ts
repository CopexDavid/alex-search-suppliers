// API для получения конкретного чата
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/chats/[id]
 * Получить информацию о чате с привязками к позициям
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            positions: true
          }
        },
        positionChats: {
          include: {
            position: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!chat) {
      return NextResponse.json(
        { error: 'Чат не найден' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: chat
    })

  } catch (error: any) {
    console.error('❌ Ошибка загрузки чата:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

