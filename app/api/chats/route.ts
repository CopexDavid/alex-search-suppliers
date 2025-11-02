// API для управления чатами
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/chats
 * Получить список чатов
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    
    const skip = (page - 1) * limit
    
    // Строим условия фильтрации
    const where: any = {}
    
    if (search) {
      where.OR = [
        { contactName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
        { requestId: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (status) {
      where.status = status
    }
    
    // Получаем чаты с пагинацией
    const [chats, total] = await Promise.all([
      prisma.chat.findMany({
        where,
        include: {
          request: {
            select: {
              id: true,
              requestNumber: true,
              description: true,
              status: true
            }
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              messages: true
            }
          }
        },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.chat.count({ where })
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        chats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
    
  } catch (error: any) {
    console.error('❌ Error fetching chats:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка при получении чатов' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chats
 * Создать новый чат
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth()
    
    const { phoneNumber, contactName, requestId } = await request.json()
    
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Номер телефона обязателен' },
        { status: 400 }
      )
    }
    
    // Проверяем, не существует ли уже чат с этим номером
    const existingChat = await prisma.chat.findUnique({
      where: { phoneNumber }
    })
    
    if (existingChat) {
      return NextResponse.json(
        { error: 'Чат с этим номером уже существует' },
        { status: 400 }
      )
    }
    
    // Создаем новый чат
    const chat = await prisma.chat.create({
      data: {
        phoneNumber,
        contactName,
        requestId,
        assignedTo: currentUser.id,
        status: 'ACTIVE'
      },
      include: {
        request: {
          select: {
            id: true,
            requestNumber: true,
            description: true,
            status: true
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
    
    return NextResponse.json({
      success: true,
      data: chat
    })
    
  } catch (error: any) {
    console.error('❌ Error creating chat:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка при создании чата' },
      { status: 500 }
    )
  }
}
