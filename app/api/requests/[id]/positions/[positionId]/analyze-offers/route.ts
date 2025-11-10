import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface AnalyzeParams {
  params: {
    id: string
    positionId: string
  }
}

interface AIAnalysis {
  bestOffer: string
  reasoning: string
  priceComparison: {
    offerId: string
    company: string
    price: number
    pricePerUnit: number
    savings?: number
    rank: number
  }[]
  riskAssessment: string
  recommendation: string
}

export async function POST(
  request: NextRequest,
  { params }: AnalyzeParams
) {
  try {
    const user = await requireAuth()
    const { id: requestId, positionId } = params

    console.log(`🧠 Starting AI analysis for offers in position ${positionId}`)

    // Получаем позицию и коммерческие предложения
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: {
        request: {
          include: {
            commercialOffers: {
              where: {
                confidence: { gte: 70 },
                needsManualReview: false
              },
              orderBy: { totalPrice: 'asc' } // Сортируем по цене
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

    const commercialOffers = position.request.commercialOffers

    if (commercialOffers.length < 1) {
      return NextResponse.json(
        { error: 'Недостаточно коммерческих предложений для анализа' },
        { status: 400 }
      )
    }

    console.log(`📊 Analyzing ${commercialOffers.length} commercial offers`)

    // Подготавливаем данные для анализа
    const offersData = commercialOffers.map((offer, index) => {
      const pricePerUnit = offer.totalPrice / position.quantity
      return {
        offerId: offer.id,
        company: offer.company || 'Неизвестная компания',
        price: offer.totalPrice,
        pricePerUnit: pricePerUnit,
        currency: offer.currency,
        deliveryTerm: offer.deliveryTerm,
        paymentTerm: offer.paymentTerm,
        validUntil: offer.validUntil,
        confidence: offer.confidence,
        rank: index + 1
      }
    })

    // Находим лучшее предложение (самое дешевое)
    const bestOffer = offersData[0] // Уже отсортировано по цене
    const worstOffer = offersData[offersData.length - 1]

    // Рассчитываем экономию
    const priceComparison = offersData.map(offer => ({
      ...offer,
      savings: offer.offerId === bestOffer.offerId ? 0 : offer.price - bestOffer.price
    }))

    // Генерируем анализ через GPT
    const aiAnalysis = await generateAIAnalysis(position, offersData, bestOffer)

    // Логируем результат
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'AI_OFFERS_ANALYSIS',
        entity: 'Position',
        entityId: positionId,
        details: {
          positionName: position.name,
          offersAnalyzed: commercialOffers.length,
          bestOffer: bestOffer.company,
          totalSavings: worstOffer.price - bestOffer.price,
          avgPrice: Math.round(offersData.reduce((sum, o) => sum + o.price, 0) / offersData.length)
        }
      }
    })

    console.log(`✅ AI offers analysis completed for position ${position.name}`)
    console.log(`💰 Best offer: ${bestOffer.company} - ${bestOffer.price} ${bestOffer.currency}`)

    return NextResponse.json({
      success: true,
      analysis: {
        bestOffer: bestOffer.offerId,
        reasoning: aiAnalysis.reasoning,
        priceComparison,
        riskAssessment: aiAnalysis.riskAssessment,
        recommendation: aiAnalysis.recommendation
      }
    })

  } catch (error: any) {
    console.error('❌ AI Offers Analysis Error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

/**
 * Генерирует ИИ анализ коммерческих предложений
 */
async function generateAIAnalysis(
  position: any,
  offers: any[],
  bestOffer: any
): Promise<{ reasoning: string; riskAssessment: string; recommendation: string }> {
  try {
    const { openai } = await import('@/lib/openai')

    const prompt = `
Ты - эксперт по закупкам. Проанализируй коммерческие предложения для позиции "${position.name}" (${position.quantity} ${position.unit}).

ПОЛУЧЕННЫЕ ПРЕДЛОЖЕНИЯ:
${offers.map((offer, i) => `
${i + 1}. ${offer.company}
   - Цена: ${offer.price.toLocaleString()} ${offer.currency}
   - За единицу: ${offer.pricePerUnit.toLocaleString()} ${offer.currency}
   - Срок поставки: ${offer.deliveryTerm || 'не указан'}
   - Условия оплаты: ${offer.paymentTerm || 'не указаны'}
   - Срок действия: ${offer.validUntil || 'не указан'}
   - Точность парсинга: ${offer.confidence}%
`).join('')}

ЛУЧШЕЕ ПРЕДЛОЖЕНИЕ ПО ЦЕНЕ: ${bestOffer.company} - ${bestOffer.price.toLocaleString()} ${bestOffer.currency}

Проанализируй и предоставь:

1. ОБОСНОВАНИЕ выбора лучшего предложения (учитывай не только цену, но и сроки, условия, надежность)

2. ОЦЕНКА РИСКОВ для каждого предложения

3. ФИНАЛЬНАЯ РЕКОМЕНДАЦИЯ с конкретными действиями

Отвечай на русском языке, структурированно и профессионально.
`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Ты эксперт по закупкам с 15-летним опытом. Анализируешь коммерческие предложения объективно, учитывая цену, качество, риски и условия поставки."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })

    const aiResponse = response.choices[0]?.message?.content || ''
    
    // Парсим ответ ИИ (упрощенная версия)
    const sections = aiResponse.split(/\d\.\s*/)
    
    return {
      reasoning: sections[1] || 'Анализ цены и условий поставки показывает оптимальное соотношение.',
      riskAssessment: sections[2] || 'Риски минимальны при выборе проверенного поставщика.',
      recommendation: sections[3] || `Рекомендуется выбрать предложение от ${bestOffer.company} как наиболее выгодное по цене.`
    }

  } catch (error) {
    console.error('❌ Ошибка генерации ИИ анализа:', error)
    
    // Fallback анализ
    const savings = offers.length > 1 ? offers[offers.length - 1].price - bestOffer.price : 0
    
    return {
      reasoning: `Анализ ${offers.length} предложений показал, что ${bestOffer.company} предлагает лучшую цену ${bestOffer.price.toLocaleString()} ${bestOffer.currency} за ${position.quantity} ${position.unit}.`,
      riskAssessment: offers.length === 1 
        ? 'Получено только одно предложение. Рекомендуется запросить дополнительные КП для сравнения.'
        : `Экономия по сравнению с самым дорогим предложением составляет ${savings.toLocaleString()} ${bestOffer.currency}.`,
      recommendation: `Рекомендуется принять предложение от ${bestOffer.company}. ${bestOffer.deliveryTerm ? `Срок поставки: ${bestOffer.deliveryTerm}.` : ''} ${bestOffer.paymentTerm ? `Условия оплаты: ${bestOffer.paymentTerm}.` : ''}`
    }
  }
}
