// API для получения статистики дашборда
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { RequestStatus } from '@prisma/client'

export async function GET() {
  try {
    const user = await requireAuth()
    
    // Получаем текущую дату и дату месяц назад
    const now = new Date()
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    
    // Параллельно получаем все нужные данные
    const [
      totalRequests,
      activeRequests,
      monthlyProcessed,
      pendingApproval,
      recentRequests,
      statusCounts
    ] = await Promise.all([
      // Общее количество заявок
      prisma.request.count({
        where: {
          status: {
            not: RequestStatus.ARCHIVED
          }
        }
      }),
      
      // Активные заявки (не завершенные и не архивированные)
      prisma.request.count({
        where: {
          status: {
            in: [RequestStatus.UPLOADED, RequestStatus.SEARCHING, RequestStatus.PENDING_QUOTES, RequestStatus.COMPARING]
          }
        }
      }),
      
      // Обработано за месяц
      prisma.request.count({
        where: {
          status: {
            in: [RequestStatus.COMPLETED, RequestStatus.APPROVED]
          },
          updatedAt: {
            gte: monthAgo
          }
        }
      }),
      
      // На согласовании
      prisma.request.count({
        where: {
          status: RequestStatus.APPROVED
        }
      }),
      
      // Последние заявки
      prisma.request.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          positions: true,
          _count: {
            select: {
              suppliers: true,
              quotes: true
            }
          }
        },
        where: {
          status: {
            not: RequestStatus.ARCHIVED
          }
        }
      }),
      
      // Подсчет по статусам
      prisma.request.groupBy({
        by: ['status'],
        _count: {
          id: true
        },
        where: {
          status: {
            not: RequestStatus.ARCHIVED
          }
        }
      })
    ])
    
    // Вычисляем рост (простая формула для демонстрации)
    const previousMonthProcessed = await prisma.request.count({
      where: {
        status: {
          in: [RequestStatus.COMPLETED, RequestStatus.APPROVED]
        },
        updatedAt: {
          gte: new Date(monthAgo.getFullYear(), monthAgo.getMonth() - 1, monthAgo.getDate()),
          lt: monthAgo
        }
      }
    })
    
    const growthPercentage = previousMonthProcessed > 0 
      ? Math.round(((monthlyProcessed - previousMonthProcessed) / previousMonthProcessed) * 100)
      : monthlyProcessed > 0 ? 100 : 0
    
    // Формируем статистику
    const stats = {
      activeRequests,
      monthlyProcessed,
      pendingApproval,
      growthPercentage: `${growthPercentage >= 0 ? '+' : ''}${growthPercentage}%`,
      totalRequests
    }
    
    // Формируем уведомления
    const notifications = []
    if (pendingApproval > 0) {
      notifications.push(`${pendingApproval} заявок ожидают согласования`)
    }
    
    // Подсчитываем новые ответы от поставщиков (заявки с котировками)
    const requestsWithQuotes = await prisma.request.count({
      where: {
        quotes: {
          some: {
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // за последние 24 часа
            }
          }
        }
      }
    })
    
    if (requestsWithQuotes > 0) {
      notifications.push(`${requestsWithQuotes} новых ответов от поставщиков`)
    }
    
    // Просроченные заявки
    const overdueRequests = await prisma.request.count({
      where: {
        deadline: {
          lt: now
        },
        status: {
          in: [RequestStatus.UPLOADED, RequestStatus.SEARCHING, RequestStatus.PENDING_QUOTES, RequestStatus.COMPARING]
        }
      }
    })
    
    if (overdueRequests > 0) {
      notifications.push(`${overdueRequests} заявок просрочено`)
    }
    
    return NextResponse.json({
      success: true,
      data: {
        stats,
        recentRequests,
        notifications,
        statusCounts: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.id
          return acc
        }, {} as Record<string, number>)
      }
    })
    
  } catch (error: any) {
    console.error('Dashboard stats error:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка при получении статистики' },
      { status: 500 }
    )
  }
}
