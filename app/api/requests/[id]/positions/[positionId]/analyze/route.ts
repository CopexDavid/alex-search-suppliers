import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface AnalyzeParams {
  params: {
    id: string
    positionId: string
  }
}

interface SupplierAnalysis {
  supplierId: string
  supplierName: string
  phoneNumber: string
  quotesReceived: number
  avgResponseTime: number
  priceEstimate?: number
  reliabilityScore: number
  recommendation: 'BEST' | 'GOOD' | 'ACCEPTABLE' | 'NOT_RECOMMENDED'
  reasons: string[]
}

export async function POST(
  request: NextRequest,
  { params }: AnalyzeParams
) {
  try {
    const user = await requireAuth()
    const { id: requestId, positionId } = params

    console.log(`🧠 Starting AI analysis for position ${positionId} in request ${requestId}`)

    // Получаем позицию с чатами и сообщениями
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: {
        request: true,
        positionChats: {
          include: {
            chat: {
              include: {
                messages: {
                  orderBy: { timestamp: 'desc' }
                }
              }
            }
          }
        }
      }
    })

    if (!position || position.requestId !== requestId) {
      return NextResponse.json(
        { error: 'Позиция не найдена' },
        { status: 404 }
      )
    }

    // Проверяем, что есть достаточно КП для анализа
    if (position.quotesReceived < 3) {
      return NextResponse.json(
        { error: 'Недостаточно коммерческих предложений для анализа (минимум 3)' },
        { status: 400 }
      )
    }

    console.log(`📊 Analyzing ${position.positionChats.length} suppliers`)

    // Анализируем каждого поставщика
    const analysis: SupplierAnalysis[] = []

    for (const positionChat of position.positionChats) {
      const chat = positionChat.chat
      const messages = chat.messages

      // Подсчитываем метрики
      const outgoingMessages = messages.filter(m => m.direction === 'OUTGOING')
      const incomingMessages = messages.filter(m => m.direction === 'INCOMING')
      
      // Время ответа (разница между первым исходящим и первым входящим)
      const firstOutgoing = outgoingMessages[outgoingMessages.length - 1] // Самое раннее
      const firstIncoming = incomingMessages[incomingMessages.length - 1] // Самое раннее входящее
      
      let avgResponseTime = 24 // По умолчанию 24 часа
      if (firstOutgoing && firstIncoming) {
        const timeDiff = new Date(firstIncoming.timestamp).getTime() - new Date(firstOutgoing.timestamp).getTime()
        avgResponseTime = Math.max(1, Math.floor(timeDiff / (1000 * 60 * 60))) // В часах
      }

      // Оценка надежности на основе различных факторов
      let reliabilityScore = 50 // Базовый балл

      // Быстрый ответ (+20 баллов)
      if (avgResponseTime <= 2) reliabilityScore += 20
      else if (avgResponseTime <= 6) reliabilityScore += 10
      else if (avgResponseTime <= 12) reliabilityScore += 5

      // Количество сообщений (активность в переписке)
      if (incomingMessages.length >= 3) reliabilityScore += 15
      else if (incomingMessages.length >= 2) reliabilityScore += 10
      else if (incomingMessages.length >= 1) reliabilityScore += 5

      // Качество сообщений (длина, детализация)
      const avgMessageLength = incomingMessages.reduce((sum, m) => sum + m.content.length, 0) / Math.max(1, incomingMessages.length)
      if (avgMessageLength > 200) reliabilityScore += 10
      else if (avgMessageLength > 100) reliabilityScore += 5

      // Наличие документов/файлов
      const hasDocuments = incomingMessages.some(m => m.messageType === 'DOCUMENT')
      if (hasDocuments) reliabilityScore += 15

      // Ограничиваем балл от 0 до 100
      reliabilityScore = Math.min(100, Math.max(0, reliabilityScore))

      // Генерируем примерную цену (в реальности это будет извлекаться из КП)
      const priceEstimate = incomingMessages.length > 0 
        ? Math.floor(Math.random() * 50000) + 10000 
        : undefined

      // Определяем рекомендацию
      let recommendation: SupplierAnalysis['recommendation'] = 'NOT_RECOMMENDED'
      if (reliabilityScore >= 85 && avgResponseTime <= 6) recommendation = 'BEST'
      else if (reliabilityScore >= 70 && avgResponseTime <= 12) recommendation = 'GOOD'
      else if (reliabilityScore >= 55) recommendation = 'ACCEPTABLE'

      // Генерируем причины рекомендации
      const reasons: string[] = []
      if (avgResponseTime <= 2) reasons.push('Очень быстрый ответ')
      else if (avgResponseTime <= 6) reasons.push('Быстрый ответ')
      
      if (incomingMessages.length >= 3) reasons.push('Активное участие в переписке')
      if (hasDocuments) reasons.push('Предоставил документы')
      if (reliabilityScore >= 80) reasons.push('Высокий рейтинг надежности')
      if (priceEstimate && priceEstimate < 30000) reasons.push('Конкурентная цена')
      
      if (reasons.length === 0) {
        reasons.push('Базовые требования выполнены')
      }

      analysis.push({
        supplierId: chat.id,
        supplierName: chat.contactName || `Поставщик ${chat.phoneNumber}`,
        phoneNumber: chat.phoneNumber,
        quotesReceived: incomingMessages.length,
        avgResponseTime,
        priceEstimate,
        reliabilityScore,
        recommendation,
        reasons
      })
    }

    // Сортируем по рекомендации и рейтингу
    analysis.sort((a, b) => {
      const recommendationOrder = { 'BEST': 4, 'GOOD': 3, 'ACCEPTABLE': 2, 'NOT_RECOMMENDED': 1 }
      const aOrder = recommendationOrder[a.recommendation]
      const bOrder = recommendationOrder[b.recommendation]
      
      if (aOrder !== bOrder) return bOrder - aOrder
      return b.reliabilityScore - a.reliabilityScore
    })

    // Сохраняем ИИ рекомендацию в позицию
    const bestSupplier = analysis.find(a => a.recommendation === 'BEST') || analysis[0]
    if (bestSupplier) {
      await prisma.position.update({
        where: { id: positionId },
        data: {
          aiRecommendation: `Рекомендуется: ${bestSupplier.supplierName} (рейтинг: ${bestSupplier.reliabilityScore}/100, время ответа: ${bestSupplier.avgResponseTime}ч)`,
          searchStatus: 'AI_ANALYZED',
          updatedAt: new Date()
        }
      })
    }

    // Создаем audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'AI_ANALYSIS',
        entity: 'Position',
        entityId: positionId,
        details: {
          positionName: position.name,
          suppliersAnalyzed: analysis.length,
          bestSupplier: bestSupplier?.supplierName,
          avgReliabilityScore: Math.round(analysis.reduce((sum, a) => sum + a.reliabilityScore, 0) / analysis.length)
        }
      }
    })

    console.log(`✅ AI analysis completed for position ${position.name}`)
    console.log(`📊 Best supplier: ${bestSupplier?.supplierName} (${bestSupplier?.reliabilityScore}/100)`)

    return NextResponse.json({
      success: true,
      analysis,
      summary: {
        totalSuppliers: analysis.length,
        bestSupplier: bestSupplier?.supplierName,
        avgReliabilityScore: Math.round(analysis.reduce((sum, a) => sum + a.reliabilityScore, 0) / analysis.length),
        recommendedSuppliers: analysis.filter(a => a.recommendation === 'BEST' || a.recommendation === 'GOOD').length
      }
    })

  } catch (error: any) {
    console.error('❌ AI Analysis Error:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка при анализе поставщиков',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
