import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface SearchLogsParams {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: SearchLogsParams
) {
  try {
    const user = await requireAuth()
    const { id: requestId } = params

    // Проверяем существование заявки
    const requestExists = await prisma.request.findUnique({
      where: { id: requestId },
      select: { id: true }
    })

    if (!requestExists) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      )
    }

    // Получаем логи аудита связанные с поиском поставщиков для этой заявки
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        AND: [
          {
            OR: [
              { action: { contains: 'search' } },
              { action: { contains: 'поиск' } },
              { action: { contains: 'supplier' } },
              { action: { contains: 'поставщик' } }
            ]
          },
          {
            OR: [
              { details: { contains: requestId } },
              { entityId: requestId }
            ]
          }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Ограничиваем количество записей
    })

    // Получаем позиции заявки для дополнительной информации
    const positions = await prisma.position.findMany({
      where: { requestId },
      select: { id: true, name: true }
    })

    // Преобразуем логи в нужный формат
    const searchLogs = auditLogs.map(log => {
      let details = null
      let searchQueries: string[] = []
      let resultsFound = 0
      let suppliersFound = 0
      let status = 'success'
      let errorMessage = undefined
      let positionName = 'Общий поиск'
      let positionId = requestId

      try {
        if (log.details) {
          const parsedDetails = JSON.parse(log.details)
          
          // Извлекаем информацию из деталей лога
          if (parsedDetails.searchQueries) {
            searchQueries = Array.isArray(parsedDetails.searchQueries) 
              ? parsedDetails.searchQueries 
              : [parsedDetails.searchQueries]
          }
          
          if (parsedDetails.resultsFound !== undefined) {
            resultsFound = parsedDetails.resultsFound
          }
          
          if (parsedDetails.suppliersFound !== undefined) {
            suppliersFound = parsedDetails.suppliersFound
          }
          
          if (parsedDetails.positionId) {
            positionId = parsedDetails.positionId
            const position = positions.find(p => p.id === parsedDetails.positionId)
            if (position) {
              positionName = position.name
            }
          }
          
          if (parsedDetails.error) {
            status = 'error'
            errorMessage = parsedDetails.error
          }
          
          // Детальная статистика
          details = {
            googleResults: parsedDetails.googleResults || 0,
            yandexResults: parsedDetails.yandexResults || 0,
            filteredResults: parsedDetails.filteredResults || 0,
            contactsParsed: parsedDetails.contactsParsed || 0
          }
        }
      } catch (e) {
        // Если не удается распарсить детали, используем базовую информацию
        console.warn('Failed to parse audit log details:', e)
      }

      return {
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        positionId,
        positionName,
        searchQueries,
        resultsFound,
        suppliersFound,
        status,
        duration: undefined, // Пока не отслеживаем время выполнения
        errorMessage,
        details
      }
    })

    return NextResponse.json({
      success: true,
      logs: searchLogs
    })

  } catch (error: any) {
    console.error('Error fetching search logs:', error)
    
    // Проверяем, является ли это ошибкой авторизации
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Необходима авторизация для просмотра логов поиска' },
        { status: 401 }
      )
    }
    
    if (error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Недостаточно прав для просмотра логов поиска' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка получения логов поиска' },
      { status: 500 }
    )
  }
}
