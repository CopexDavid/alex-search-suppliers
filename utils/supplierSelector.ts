/**
 * ИИ система выбора релевантных поставщиков
 */

import { openai } from '@/lib/openai'

export interface SupplierCandidate {
  id: string
  name: string
  description?: string
  website?: string
  address?: string
  tags?: string
  rating: number
  // Данные из поиска
  foundVia: string
  searchRelevance: number
  contacts: {
    email?: string
    phone?: string
    whatsapp?: string
  }
}

export interface SupplierAnalysis {
  supplierId: string
  relevanceScore: number // 0-100
  reasons: string[]
  pros: string[]
  cons: string[]
  recommendation: 'highly_recommended' | 'recommended' | 'consider' | 'not_recommended'
}

export interface PositionRequirement {
  name: string
  description?: string
  quantity: number
  unit: string
  category?: string
}

/**
 * Анализирует и выбирает лучших поставщиков для позиции через GPT
 */
export async function selectBestSuppliers(
  position: PositionRequirement,
  candidates: SupplierCandidate[],
  maxSuppliers: number = 3
): Promise<SupplierAnalysis[]> {
  console.log(`🤖 Анализируем ${candidates.length} поставщиков для позиции: ${position.name}`)
  
  if (candidates.length === 0) {
    return []
  }
  
  // Если поставщиков меньше чем нужно, возвращаем всех
  if (candidates.length <= maxSuppliers) {
    return candidates.map(supplier => ({
      supplierId: supplier.id,
      relevanceScore: Math.max(60, supplier.searchRelevance * 100),
      reasons: [`Поставщик найден через ${supplier.foundVia}`],
      pros: [supplier.description || 'Поставщик товаров'],
      cons: [],
      recommendation: 'recommended' as const
    }))
  }

  try {
    const analysis = await analyzeSuppliers(position, candidates, maxSuppliers)
    
    // Сортируем по релевантности и берем топ
    const sortedAnalysis = analysis
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxSuppliers)
    
    console.log(`✅ Выбрано ${sortedAnalysis.length} лучших поставщиков`)
    
    return sortedAnalysis
    
  } catch (error) {
    console.error('❌ Ошибка ИИ анализа поставщиков:', error)
    
    // Fallback: берем топ по рейтингу и релевантности поиска
    return candidates
      .sort((a, b) => (b.rating + b.searchRelevance) - (a.rating + a.searchRelevance))
      .slice(0, maxSuppliers)
      .map(supplier => ({
        supplierId: supplier.id,
        relevanceScore: Math.max(50, (supplier.rating * 20 + supplier.searchRelevance * 80)),
        reasons: [`Высокий рейтинг (${supplier.rating}/5)`, `Найден через ${supplier.foundVia}`],
        pros: [supplier.description || 'Надежный поставщик'],
        cons: ['Анализ ИИ недоступен'],
        recommendation: 'recommended' as const
      }))
  }
}

/**
 * Анализ поставщиков через GPT
 */
async function analyzeSuppliers(
  position: PositionRequirement,
  candidates: SupplierCandidate[],
  maxSuppliers: number
): Promise<SupplierAnalysis[]> {
  
  const prompt = `
Ты - эксперт по закупкам в Казахстане. Проанализируй поставщиков для следующей позиции и выбери ${maxSuppliers} лучших.

ПОЗИЦИЯ ДЛЯ ЗАКУПКИ:
- Название: ${position.name}
- Описание: ${position.description || 'Не указано'}
- Количество: ${position.quantity} ${position.unit}
- Категория: ${position.category || 'Не указана'}

ПОСТАВЩИКИ-КАНДИДАТЫ:
${candidates.map((supplier, index) => `
${index + 1}. ID: ${supplier.id}
   Название: ${supplier.name}
   Описание: ${supplier.description || 'Не указано'}
   Сайт: ${supplier.website || 'Не указан'}
   Адрес: ${supplier.address || 'Не указан'}
   Теги: ${supplier.tags || 'Не указаны'}
   Рейтинг: ${supplier.rating}/5
   Найден через: ${supplier.foundVia}
   Релевантность поиска: ${Math.round(supplier.searchRelevance * 100)}%
   Контакты: ${JSON.stringify(supplier.contacts)}
`).join('\n')}

КРИТЕРИИ ОЦЕНКИ:
1. Релевантность товаров/услуг (40%)
2. Географическое расположение (Казахстан - приоритет) (25%)
3. Рейтинг и репутация (20%)
4. Наличие контактов (WhatsApp предпочтительно) (15%)

ОСОБЕННОСТИ КАЗАХСТАНА:
- Приоритет местным поставщикам
- Важны сроки доставки внутри страны
- Валюта - тенге (KZT)
- Языки: казахский, русский

Проанализируй каждого поставщика и верни ТОЛЬКО валидный JSON массив без дополнительного текста:

[
  {
    "supplierId": "string",
    "relevanceScore": number (0-100),
    "reasons": ["причина1", "причина2"],
    "pros": ["плюс1", "плюс2"],
    "cons": ["минус1", "минус2"],
    "recommendation": "highly_recommended" | "recommended" | "consider" | "not_recommended"
  }
]

ВАЖНО: Верни ТОЛЬКО JSON массив, без markdown блоков, без дополнительного текста!

ВАЖНО:
- Оценивай объективно
- Учитывай специфику Казахстана
- Местные поставщики получают бонус +10 к релевантности
- Поставщики с WhatsApp получают бонус +5 к релевантности
- Отвечай ТОЛЬКО валидным JSON массивом
`

  console.log('🤖 Отправляем запрос в GPT для анализа поставщиков...')
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Ты эксперт по закупкам в Казахстане. Анализируешь поставщиков и отвечаешь только валидным JSON."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 3000
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('Пустой ответ от GPT')
  }

  console.log('🤖 Получен ответ от GPT, парсим анализ...')
  
  try {
    // Извлекаем JSON из markdown блока
    let jsonContent = content.trim()
    
    // Если ответ в markdown блоке ```json ... ``` или просто содержит ```
    if (jsonContent.includes('```')) {
      const startIndex = jsonContent.indexOf('[')
      const lastBracketIndex = jsonContent.lastIndexOf(']')
      
      if (startIndex !== -1 && lastBracketIndex !== -1 && lastBracketIndex > startIndex) {
        jsonContent = jsonContent.substring(startIndex, lastBracketIndex + 1)
      } else {
        throw new Error('Не найден валидный JSON массив в ответе GPT')
      }
    }
    
    // Если JSON обрезан, пытаемся починить
    if (!jsonContent.trim().endsWith(']')) {
      const lastCommaIndex = jsonContent.lastIndexOf(',')
      if (lastCommaIndex !== -1) {
        // Обрезаем до последней запятой и добавляем закрывающую скобку
        jsonContent = jsonContent.substring(0, lastCommaIndex) + ']'
      }
    }
    
    console.log('📝 Извлеченный JSON:', jsonContent.substring(0, 200) + '...')
    
    const analysis = JSON.parse(jsonContent)
    
    if (!Array.isArray(analysis)) {
      throw new Error('GPT вернул не массив')
    }
    
    // Валидируем структуру
    const validAnalysis = analysis.filter(item => 
      item.supplierId && 
      typeof item.relevanceScore === 'number' &&
      Array.isArray(item.reasons) &&
      Array.isArray(item.pros) &&
      Array.isArray(item.cons) &&
      item.recommendation
    )
    
    console.log(`✅ Получен валидный анализ для ${validAnalysis.length} поставщиков`)
    
    return validAnalysis
    
  } catch (parseError) {
    console.error('❌ Ошибка парсинга JSON от GPT:', parseError)
    console.log('📝 Ответ GPT:', content)
    throw new Error('Не удалось распарсить ответ GPT')
  }
}

/**
 * Получает настройку количества поставщиков для контакта
 */
export async function getSuppliersToContactCount(): Promise<number> {
  try {
    const { default: prisma } = await import('@/lib/prisma')
    
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'suppliers_to_contact' }
    })
    
    const count = setting ? parseInt(setting.value) : 3
    
    // Ограничиваем диапазон 1-10
    return Math.max(1, Math.min(10, count))
    
  } catch (error) {
    console.error('❌ Ошибка получения настройки suppliers_to_contact:', error)
    return 3 // Значение по умолчанию
  }
}
