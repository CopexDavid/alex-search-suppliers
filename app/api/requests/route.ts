// API для управления заявками
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { RequestStatus } from '@prisma/client'

// GET /api/requests - Получить список заявок
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    // Фильтры
    const statusParam = searchParams.get('status')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Строим запрос с фильтрами
    const where: any = {}
    
    if (statusParam && statusParam !== 'ALL') {
      // Поддержка множественных статусов через запятую
      const statuses = statusParam.split(',').map(s => s.trim())
      if (statuses.length === 1) {
        where.status = statuses[0] as RequestStatus
      } else {
        where.status = { in: statuses as RequestStatus[] }
      }
    }
    
    if (search) {
      where.OR = [
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Получаем заявки
    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
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
                        take: 10 // Последние 10 сообщений для анализа
                      }
                    }
                  }
                }
              }
            }
          },
          _count: {
            select: {
              quotes: true,
              suppliers: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.request.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error: any) {
    console.error('Get requests error:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при получении заявок' },
      { status: 500 }
    )
  }
}

// POST /api/requests - Создать новую заявку
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const {
      requestNumber,
      description,
      deadline,
      budget,
      currency = 'KZT',
      positions,
    } = body

    // Валидация
    if (!requestNumber || !deadline || !positions || positions.length === 0) {
      return NextResponse.json(
        { error: 'Заполните все обязательные поля' },
        { status: 400 }
      )
    }

    // Проверка уникальности номера заявки
    const existing = await prisma.request.findUnique({
      where: { requestNumber },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Заявка с таким номером уже существует' },
        { status: 409 }
      )
    }

    // Создаем заявку с позициями
    const newRequest = await prisma.request.create({
      data: {
        requestNumber,
        description,
        deadline: new Date(deadline),
        budget,
        currency,
        creatorId: user.id,
        status: RequestStatus.UPLOADED,
        positions: {
          create: positions.map((pos: any) => ({
            sku: pos.sku,
            name: pos.name,
            description: pos.description,
            quantity: pos.quantity,
            unit: pos.unit,
          })),
        },
      },
      include: {
        positions: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: newRequest,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Create request error:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при создании заявки' },
      { status: 500 }
    )
  }
}

