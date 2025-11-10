/**
 * Новый простой парсер документов для коммерческих предложений
 * Извлекает текст из PDF/DOCX и отправляет в GPT для структурирования
 */

import { openai } from '@/lib/openai'

export interface ParsedDocument {
  // Основная информация
  totalPrice?: number
  currency: string
  company?: string
  
  // Позиции товаров/услуг
  positions: DocumentPosition[]
  
  // Дополнительная информация
  deliveryTerm?: string
  paymentTerm?: string
  validUntil?: string
  
  // Метаданные
  confidence: number
  needsManualReview: boolean
  extractedText: string
  fileName: string
}

export interface DocumentPosition {
  name: string
  description?: string
  quantity: number
  unit: string
  unitPrice?: number
  totalPrice?: number
}

/**
 * Главная функция парсинга документа
 */
export async function parseDocument(
  buffer: Buffer, 
  fileName: string, 
  mimeType: string
): Promise<ParsedDocument> {
  console.log(`📄 Начинаем парсинг документа: ${fileName} (${mimeType})`)
  
  try {
    // 1. Извлекаем текст из документа
    const extractedText = await extractTextFromDocument(buffer, mimeType, fileName)
    
    if (!extractedText || extractedText.length < 10) {
      throw new Error('Не удалось извлечь текст из документа')
    }
    
    console.log(`📝 Извлечено ${extractedText.length} символов текста`)
    
    // 2. Отправляем в GPT для структурирования
    const structuredData = await structureWithGPT(extractedText, fileName)
    
    // 3. Формируем итоговый результат
    const result: ParsedDocument = {
      ...structuredData,
      extractedText: extractedText.substring(0, 2000), // Первые 2000 символов
      fileName,
      confidence: calculateConfidence(structuredData),
      needsManualReview: shouldRequireManualReview(structuredData)
    }
    
    console.log(`✅ Документ успешно обработан. Уверенность: ${result.confidence}%`)
    console.log(`📊 Найдено позиций: ${result.positions.length}`)
    console.log(`💰 Общая сумма: ${result.totalPrice || 'не определена'} ${result.currency}`)
    
    return result
    
  } catch (error: any) {
    console.error('❌ Ошибка парсинга документа:', error)
    
    // Возвращаем базовый результат с ошибкой
    return {
      currency: 'KZT',
      positions: [],
      confidence: 0,
      needsManualReview: true,
      extractedText: `Ошибка парсинга: ${error.message}`,
      fileName
    }
  }
}

/**
 * Извлечение текста из документа в зависимости от типа
 */
async function extractTextFromDocument(
  buffer: Buffer, 
  mimeType: string, 
  fileName: string
): Promise<string> {
  console.log(`🔍 Извлекаем текст из ${mimeType}...`)
  
  if (mimeType === 'application/pdf') {
    return await extractTextFromPDF(buffer)
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    return await extractTextFromWord(buffer)
  } else {
    throw new Error(`Неподдерживаемый тип документа: ${mimeType}`)
  }
}

/**
 * Извлечение текста из PDF с помощью pdf2json
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const PDFParser = (await import('pdf2json')).default
  
  return new Promise<string>((resolve, reject) => {
    const pdfParser = new PDFParser()
    
    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(new Error(errData.parserError || 'Ошибка парсинга PDF'))
    })
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        const textParts: string[] = []
        
        if (pdfData.Pages) {
          for (const page of pdfData.Pages) {
            if (page.Texts) {
              // Сортируем текстовые элементы по позиции
              const sortedTexts = page.Texts.sort((a: any, b: any) => {
                if (Math.abs(a.y - b.y) > 0.5) return a.y - b.y
                return a.x - b.x
              })
              
              for (const text of sortedTexts) {
                if (text.R) {
                  for (const run of text.R) {
                    if (run.T) {
                      const decodedText = decodeURIComponent(run.T)
                      textParts.push(decodedText)
                    }
                  }
                }
              }
            }
          }
        }
        
        // Объединяем и очищаем текст
        let fullText = textParts.join(' ')
        
        // Исправляем разорванные слова и числа
        fullText = fullText
          .replace(/([а-яё])\s+([а-яё])/gi, '$1$2')
          .replace(/([a-z])\s+([a-z])/gi, '$1$2')
          .replace(/(\d)\s+(\d)/g, '$1$2')
          .replace(/K\s*Z\s*T/gi, 'KZT')
          .replace(/R\s*U\s*B/gi, 'RUB')
          .replace(/U\s*S\s*D/gi, 'USD')
          .replace(/E\s*U\s*R/gi, 'EUR')
          .replace(/\s+/g, ' ')
          .trim()
        
        resolve(fullText)
      } catch (err) {
        reject(err)
      }
    })
    
    pdfParser.parseBuffer(buffer)
  })
}

/**
 * Извлечение текста из Word документа с помощью mammoth
 */
async function extractTextFromWord(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  
  const result = await mammoth.extractRawText({ buffer })
  return result.value.trim()
}

/**
 * Структурирование текста с помощью GPT
 */
async function structureWithGPT(text: string, fileName: string): Promise<Omit<ParsedDocument, 'extractedText' | 'fileName' | 'confidence' | 'needsManualReview'>> {
  const prompt = `
Ты - эксперт по анализу коммерческих предложений. Проанализируй следующий текст документа и извлеки структурированную информацию.

ТЕКСТ ДОКУМЕНТА:
${text}

Извлеки следующую информацию в JSON формате:

{
  "totalPrice": число (общая итоговая сумма, если указана),
  "currency": "KZT" | "USD" | "EUR" | "RUB" (валюта),
  "company": "строка" (название компании-поставщика),
  "deliveryTerm": "строка" (срок поставки, например "7 дней"),
  "paymentTerm": "строка" (условия оплаты, например "100% предоплата"),
  "validUntil": "строка" (срок действия предложения),
  "positions": [
    {
      "name": "строка" (название товара/услуги),
      "description": "строка" (описание, если есть),
      "quantity": число (количество),
      "unit": "строка" (единица измерения: шт, кг, л, м и т.д.),
      "unitPrice": число (цена за единицу, если указана),
      "totalPrice": число (общая цена позиции, если указана)
    }
  ]
}

ВАЖНЫЕ ПРАВИЛА:
1. Если информация не найдена, используй null
2. Цены указывай только числами без валют и пробелов
3. Количество всегда должно быть числом > 0
4. Единицы измерения приводи к стандартному виду (шт, кг, л, м, м2, м3)
5. Ищи ключевые слова: итого, сумма, стоимость, цена, доставка, оплата, срок
6. Обращай внимание на таблицы с позициями товаров
7. Если есть НДС, включай его в итоговую сумму

Отвечай ТОЛЬКО валидным JSON, без дополнительных комментариев.
`

  try {
    console.log('🤖 Отправляем текст в GPT для структурирования...')
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Ты эксперт по парсингу коммерческих предложений. Отвечаешь только валидным JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Пустой ответ от GPT')
    }

    console.log('🤖 Получен ответ от GPT, парсим JSON...')
    const parsed = JSON.parse(content)
    
    // Валидируем и очищаем позиции
    const validPositions = (parsed.positions || []).filter((pos: any) => 
      pos.name && pos.quantity > 0
    ).map((pos: any) => ({
      name: pos.name,
      description: pos.description || undefined,
      quantity: Number(pos.quantity) || 1,
      unit: pos.unit || 'шт',
      unitPrice: pos.unitPrice ? Number(pos.unitPrice) : undefined,
      totalPrice: pos.totalPrice ? Number(pos.totalPrice) : undefined
    }))

    return {
      totalPrice: parsed.totalPrice ? Number(parsed.totalPrice) : undefined,
      currency: parsed.currency || 'KZT',
      company: parsed.company || undefined,
      deliveryTerm: parsed.deliveryTerm || undefined,
      paymentTerm: parsed.paymentTerm || undefined,
      validUntil: parsed.validUntil || undefined,
      positions: validPositions
    }

  } catch (error) {
    console.error('❌ Ошибка GPT парсинга:', error)
    throw new Error(`Ошибка обработки GPT: ${error.message}`)
  }
}

/**
 * Вычисление уверенности парсинга
 */
function calculateConfidence(data: any): number {
  let confidence = 50 // Базовая уверенность
  
  if (data.totalPrice) confidence += 30
  if (data.positions && data.positions.length > 0) confidence += 20
  if (data.company) confidence += 10
  if (data.deliveryTerm || data.paymentTerm) confidence += 10
  
  return Math.min(100, confidence)
}

/**
 * Определение необходимости ручной проверки
 */
function shouldRequireManualReview(data: any): boolean {
  // Требуем ручной проверки если:
  // - Нет итоговой цены И нет позиций
  // - Очень мало информации
  return (!data.totalPrice && (!data.positions || data.positions.length === 0))
}
