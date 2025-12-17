// API для работы с журналом аудита
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/audit - Получить логи аудита
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    // Фильтры
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const entity = searchParams.get('entity')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Строим запрос с фильтрами
    const where: any = {}
    
    // Фильтр по дате
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        // Добавляем время до конца дня
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = endDate
      }
    }
    
    // Фильтр по пользователю
    if (userId && userId !== 'все') {
      where.userId = userId
    }
    
    // Фильтр по действию
    if (action && action !== 'все') {
      where.action = action
    }
    
    // Фильтр по сущности
    if (entity && entity !== 'все') {
      where.entity = entity
    }

    // Получаем логи аудита
    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ])

    // Получаем статистику
    const stats = await getAuditStats()

    // Получаем список пользователей для фильтра
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Получаем уникальные действия для фильтра
    const actions = await prisma.auditLog.groupBy({
      by: ['action'],
      orderBy: {
        action: 'asc',
      },
    })

    // Получаем уникальные сущности для фильтра
    const entities = await prisma.auditLog.groupBy({
      by: ['entity'],
      where: {
        entity: {
          not: null,
        },
      },
      orderBy: {
        entity: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      data: auditLogs,
      stats,
      filters: {
        users,
        actions: actions.map(a => a.action),
        entities: entities.map(e => e.entity).filter(Boolean),
      },
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error: any) {
    console.error('Get audit logs error:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при получении логов аудита' },
      { status: 500 }
    )
  }
}

// Функция для получения статистики
async function getAuditStats() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalLogs,
    todayLogs,
    weekLogs,
    monthLogs,
    activeUsers,
    topActions,
    recentActivity,
  ] = await Promise.all([
    // Общее количество логов
    prisma.auditLog.count(),
    
    // Логи за сегодня
    prisma.auditLog.count({
      where: {
        createdAt: {
          gte: todayStart,
        },
      },
    }),
    
    // Логи за неделю
    prisma.auditLog.count({
      where: {
        createdAt: {
          gte: weekStart,
        },
      },
    }),
    
    // Логи за месяц
    prisma.auditLog.count({
      where: {
        createdAt: {
          gte: monthStart,
        },
      },
    }),
    
    // Активные пользователи (за последние 24 часа)
    prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: todayStart,
        },
        userId: {
          not: null,
        },
      },
    }).then(result => result.length),
    
    // Топ действий за неделю
    prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        createdAt: {
          gte: weekStart,
        },
      },
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
      take: 5,
    }),
    
    // Последняя активность по пользователям
    prisma.auditLog.findMany({
      where: {
        userId: {
          not: null,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    }),
  ])

  return {
    totalLogs,
    todayLogs,
    weekLogs,
    monthLogs,
    activeUsers,
    topActions: topActions.map(action => ({
      action: action.action,
      count: action._count.action,
    })),
    recentActivity,
  }
}
