// API для автоматического поиска поставщиков по всем позициям заявки
// Использует новый endpoint для каждой позиции отдельно
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface SearchParams {
  params: {
    id: string
  }
}

/**
 * POST /api/requests/[id]/search
 * Запускает автоматический поиск поставщиков для всех позиций заявки
 */
export async function POST(
  request: NextRequest,
  { params }: SearchParams
) {
  console.log('📍 Search API called (ALL POSITIONS)')
  console.log('📍 Params:', params)
  
  try {
    const user = await requireAuth()
    const requestId = params.id
    
    console.log(`🚀 Starting search for ALL positions in request: ${requestId}`)
    
    // Получаем заявку с позициями
    const requestData = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        positions: true,
      }
    })
    
    if (!requestData) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      )
    }
    
    if (requestData.positions.length === 0) {
      return NextResponse.json(
        { error: 'В заявке нет позиций для поиска' },
        { status: 400 }
      )
    }
    
    console.log(`📦 Found ${requestData.positions.length} positions to search`)
    
    // Обновляем статус заявки на SEARCHING
    await prisma.request.update({
      where: { id: requestId },
      data: { status: 'SEARCHING' as any }
    })
    
    let totalSuppliersFound = 0
    
    // Ищем поставщиков для КАЖДОЙ позиции последовательно
    for (const position of requestData.positions) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`🔍 Searching for position: ${position.name}`)
      console.log('='.repeat(60))
      
      try {
        // Вызываем API для поиска по конкретной позиции (ВСЕГДА локально для внутренних вызовов)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://alexautozakup.kz' // Используем переменную окружения
        const searchUrl = `${baseUrl}/api/requests/${requestId}/positions/${position.id}/search`
        
        console.log(`🌐 Calling: ${searchUrl}`)
        console.log(`🍪 Cookie: ${request.headers.get('cookie') ? 'SET' : 'NOT SET'}`)
        
        const response = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Передаем cookie для аутентификации
            'Cookie': request.headers.get('cookie') || '',
          },
        })
        
        console.log(`📡 Response status: ${response.status}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log(`📄 Response data:`, data)
          const suppliersFound = data.data?.suppliersFound || 0
          totalSuppliersFound += suppliersFound
          console.log(`✅ Position "${position.name}": found ${suppliersFound} suppliers`)
        } else {
          const errorText = await response.text()
          console.error(`❌ Error searching for position "${position.name}":`, response.status)
          console.error(`❌ Error details:`, errorText)
        }
        
      } catch (error) {
        console.error(`❌ Error searching for position "${position.name}":`, error)
      }
    }
    
    console.log(`\n${'='.repeat(60)}`)
    console.log(`✅ SEARCH COMPLETE`)
    console.log(`📊 Total suppliers found: ${totalSuppliersFound}`)
    console.log('='.repeat(60))
    
    // Обновляем статус заявки на SEARCHING (поставщики найдены, готовы к отправке КП)
    await prisma.request.update({
      where: { id: requestId },
      data: { status: 'SEARCHING' as any }
    })
    
    // Создаем audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SEARCH_SUPPLIERS',
        entity: 'Request',
        entityId: requestId,
        details: {
          positionsSearched: requestData.positions.length,
          suppliersFound: totalSuppliersFound
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        suppliersFound: totalSuppliersFound,
        positionsSearched: requestData.positions.length
      }
    })
    
  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка при поиске поставщиков' },
      { status: 500 }
    )
  }
}
