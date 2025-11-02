// API для управления входящими сообщениями WhatsApp
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/whatsapp/messages
 * Получить список входящих сообщений
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const phoneNumber = searchParams.get('phoneNumber')
    const processed = searchParams.get('processed')
    
    const skip = (page - 1) * limit
    
    // Строим условия фильтрации
    const where: any = {}
    
    if (phoneNumber) {
      where.phoneNumber = {
        contains: phoneNumber
      }
    }
    
    if (processed !== null) {
      where.processed = processed === 'true'
    }
    
    // Получаем сообщения с пагинацией
    const [messages, total] = await Promise.all([
      prisma.incomingMessage.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          messageId: true,
          phoneNumber: true,
          message: true,
          messageType: true,
          chatId: true,
          timestamp: true,
          source: true,
          processed: true,
          createdAt: true
        }
      }),
      prisma.incomingMessage.count({ where })
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
    
  } catch (error: any) {
    console.error('❌ Error fetching messages:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка при получении сообщений' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/whatsapp/messages
 * Массовое обновление статуса обработки сообщений
 */
export async function PATCH(request: NextRequest) {
  try {
    await requireAuth()
    
    const { messageIds, processed } = await request.json()
    
    if (!Array.isArray(messageIds) || typeof processed !== 'boolean') {
      return NextResponse.json(
        { error: 'Неверные параметры' },
        { status: 400 }
      )
    }
    
    const result = await prisma.incomingMessage.updateMany({
      where: {
        id: {
          in: messageIds
        }
      },
      data: {
        processed,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json({
      success: true,
      updated: result.count
    })
    
  } catch (error: any) {
    console.error('❌ Error updating messages:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка при обновлении сообщений' },
      { status: 500 }
    )
  }
}
