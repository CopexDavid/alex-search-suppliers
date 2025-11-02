// Тестовая версия API для диагностики
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface SearchParams {
  params: {
    id: string
    positionId: string
  }
}

export async function POST(
  request: NextRequest,
  { params }: SearchParams
) {
  try {
    console.log('\n🧪 TEST POSITION SEARCH API CALLED')
    console.log(`📝 Request ID: ${params.id}`)
    console.log(`📦 Position ID: ${params.positionId}`)
    
    const user = await requireAuth()
    console.log(`👤 User: ${user.name}`)
    
    // Получаем позицию
    const position = await prisma.position.findUnique({
      where: { id: params.positionId },
      include: {
        request: true
      }
    })
    
    if (!position || position.requestId !== params.id) {
      console.log('❌ Position not found')
      return NextResponse.json(
        { error: 'Позиция не найдена' },
        { status: 404 }
      )
    }
    
    console.log(`📦 Position found: ${position.name}`)
    
    // Возвращаем тестовый результат без поиска
    return NextResponse.json({
      success: true,
      data: {
        positionId: params.positionId,
        positionName: position.name,
        suppliersFound: 0,
        suppliers: [],
        message: 'Test API работает! Поиск временно отключен для диагностики.'
      }
    })
    
  } catch (error: any) {
    console.error('❌ Test API Error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Ошибка в тестовом API',
        details: error.stack
      },
      { status: 500 }
    )
  }
}
