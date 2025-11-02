// API для экспорта логов аудита
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/audit/export - Экспорт логов аудита в CSV
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    // Фильтры (те же что и в основном API)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const entity = searchParams.get('entity')
    const format = searchParams.get('format') || 'csv' // csv или json

    // Строим запрос с фильтрами
    const where: any = {}
    
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = endDate
      }
    }
    
    if (userId && userId !== 'все') {
      where.userId = userId
    }
    
    if (action && action !== 'все') {
      where.action = action
    }
    
    if (entity && entity !== 'все') {
      where.entity = entity
    }

    // Получаем все логи без пагинации для экспорта
    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10000, // Ограничиваем для безопасности
    })

    // Создаем audit log для экспорта
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'EXPORT_AUDIT_LOGS',
        entity: 'AuditLog',
        details: {
          recordsCount: auditLogs.length,
          filters: { dateFrom, dateTo, userId, action, entity },
          format,
        }
      }
    })

    if (format === 'json') {
      // Экспорт в JSON
      const jsonData = auditLogs.map(log => ({
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        user: log.user ? `${log.user.name} (${log.user.email})` : 'Система',
        userRole: log.user?.role || 'SYSTEM',
        action: log.action,
        entity: log.entity || '',
        entityId: log.entityId || '',
        details: log.details || {},
        ipAddress: log.ipAddress || '',
      }))

      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`,
        },
      })
    } else {
      // Экспорт в CSV
      const csvHeaders = [
        'ID',
        'Дата/Время',
        'Пользователь',
        'Роль',
        'Действие',
        'Сущность',
        'ID Сущности',
        'Подробности',
        'IP Адрес'
      ]

      const csvRows = auditLogs.map(log => [
        log.id,
        log.createdAt.toLocaleString('ru-RU'),
        log.user ? `${log.user.name} (${log.user.email})` : 'Система',
        log.user?.role || 'SYSTEM',
        log.action,
        log.entity || '',
        log.entityId || '',
        JSON.stringify(log.details || {}),
        log.ipAddress || ''
      ])

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => 
          row.map(field => 
            typeof field === 'string' && field.includes(',') 
              ? `"${field.replace(/"/g, '""')}"` 
              : field
          ).join(',')
        )
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }
  } catch (error: any) {
    console.error('Export audit logs error:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при экспорте логов аудита' },
      { status: 500 }
    )
  }
}
