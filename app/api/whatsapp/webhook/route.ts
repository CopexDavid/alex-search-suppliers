// Webhook для получения входящих сообщений от Whapi.Cloud
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * POST /api/whatsapp/webhook
 * Обработчик webhook для входящих сообщений от Whapi.Cloud
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `webhook_${startTime}`
  
  try {
    const body = await request.json()
    
    console.log(`📨 [${requestId}] Получен webhook от Whapi.Cloud:`)
    console.log(`📨 [${requestId}] Headers:`, Object.fromEntries(request.headers.entries()))
    console.log(`📨 [${requestId}] Body:`, JSON.stringify(body, null, 2))
    
    // Проверяем тип события - Whapi.Cloud использует структуру { event: { type: "messages" }, messages: [...] }
    if (body.event && body.event.type === 'messages' && body.messages && body.messages.length > 0) {
      // Обрабатываем каждое сообщение
      for (const messageData of body.messages) {
        await processMessage(messageData, requestId)
      }
    } else {
      console.log(`⚠️ [${requestId}] Неизвестный тип события:`, body.event?.type || 'unknown')
    }
    
    const processingTime = Date.now() - startTime
    console.log(`✅ [${requestId}] Webhook обработан за ${processingTime}ms`)
    
    // Возвращаем успешный ответ
    return NextResponse.json({ 
      success: true, 
      requestId,
      processingTime 
    })
    
  } catch (error: any) {
    console.error(`❌ [${requestId}] Webhook error:`, error)
    
    // Возвращаем успешный ответ даже при ошибке, чтобы Whapi.Cloud не повторял запрос
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    })
  }
}

/**
 * Обрабатывает одно сообщение от Whapi.Cloud
 */
async function processMessage(messageData: any, requestId: string) {
  try {
    console.log(`📨 [${requestId}] Обрабатываем сообщение:`, JSON.stringify(messageData, null, 2))
    
    // Извлекаем данные из структуры Whapi.Cloud
    const messageId = messageData.id
    const phoneNumber = messageData.from
    const chatId = messageData.chat_id
    const displayText = messageData.text?.body || messageData.document?.caption || messageData.document?.filename || ''
    const messageType = messageData.type || 'text'
    const timestamp = messageData.timestamp
    const fromMe = messageData.from_me
    const senderName = messageData.from_name
    
    // Пропускаем исходящие сообщения (от нас)
    if (fromMe) {
      console.log(`⚠️ [${requestId}] Пропущено исходящее сообщение`)
      return
    }
    
    // Для документов используем название файла или caption как текст сообщения
    const finalDisplayText = displayText || `[${messageType.toUpperCase()}]`
    console.log(`📨 [${requestId}] Входящее сообщение от ${phoneNumber} (${senderName}): "${finalDisplayText}"`)
    
    if (phoneNumber) {
      try {
        // Находим или создаем чат с помощью upsert
        const chat = await prisma.chat.upsert({
          where: { phoneNumber },
          create: {
            phoneNumber,
            contactName: senderName || phoneNumber,
            lastMessage: finalDisplayText,
            lastMessageAt: timestamp ? new Date(timestamp * 1000) : new Date(),
            status: 'ACTIVE',
            unreadCount: 1
          },
          update: {
            lastMessage: finalDisplayText,
            lastMessageAt: timestamp ? new Date(timestamp * 1000) : new Date(),
            unreadCount: { increment: 1 },
            ...(senderName && { contactName: senderName })
          }
        })
        
        console.log(`✅ [${requestId}] Чат обновлен для ${phoneNumber} (${senderName})`)
        
        // Сохраняем сообщение в чат
        const chatMessage = await prisma.chatMessage.create({
          data: {
            chatId: chat.id,
            messageId,
            direction: 'INCOMING',
            sender: senderName,
            content: finalDisplayText,
            messageType: messageType.toUpperCase() as any,
            status: 'DELIVERED',
            timestamp: timestamp ? new Date(timestamp * 1000) : new Date(),
            metadata: {
              whapi_data: messageData
            }
          }
        })
        
        // Также сохраняем в старую таблицу для совместимости
        await prisma.incomingMessage.create({
          data: {
            messageId: messageId || `whapi_${Date.now()}`,
            phoneNumber,
            message: finalDisplayText,
            messageType: messageType || 'text',
            chatId: chatId || phoneNumber,
            timestamp: timestamp ? new Date(timestamp * 1000) : new Date(),
            source: 'whapi',
            rawData: messageData
          }
        })
        
        console.log(`✅ [${requestId}] Сообщение сохранено в чат и базу данных`)
        
        // Специальная обработка документов
        if (messageType === 'document' && messageData.document) {
          await handleDocumentMessage(messageData, chat.id, requestId)
        } else {
          // Обрабатываем текстовое сообщение для распознавания КП
          await handleIncomingMessage(phoneNumber, finalDisplayText, messageData, chat.id, requestId)
        }
        
      } catch (dbError) {
        console.error(`❌ [${requestId}] Ошибка сохранения в БД:`, dbError)
      }
    } else {
      console.log(`⚠️ [${requestId}] Пропущено сообщение: phoneNumber=${phoneNumber}, displayText="${finalDisplayText}"`)
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Ошибка обработки сообщения:`, error)
  }
}

/**
 * GET /api/whatsapp/webhook
 * Проверка доступности webhook (для тестирования)
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    timestamp: new Date().toISOString()
  })
}

/**
 * Обработка входящего сообщения
 */
async function handleIncomingMessage(
  phoneNumber: string | null, 
  displayText: string, 
  messageData: any,
  chatId: string,
  requestId: string
) {
  try {
    if (!phoneNumber || !displayText) return
    
    console.log(`🤖 [${requestId}] Обрабатываем сообщение от ${phoneNumber}: "${displayText}"`)
    
    const lowerMessage = displayText.toLowerCase().trim()
    
    // Проверяем, является ли это коммерческим предложением
    const isQuoteMessage = await detectQuoteMessage(lowerMessage, messageData)
    
    if (isQuoteMessage) {
      console.log(`💼 [${requestId}] Обнаружено коммерческое предложение!`)
      await handleQuoteReceived(chatId, displayText, messageData, requestId)
      return // Не генерируем автоответ на КП
    }
    
    // Получаем информацию о чате и связанной заявке
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        request: {
          include: {
            positions: true
          }
        },
        positionChats: {
          include: {
            position: true
          }
        },
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 10 // Последние 10 сообщений для контекста
        }
      }
    })
    
    if (!chat || !chat.request) {
      console.log(`⚠️ [${requestId}] Чат не привязан к заявке, пропускаем автоответ`)
      return
    }
    
    // Генерируем ответ через Assistant
    console.log(`🤖 [${requestId}] Генерируем ответ через Assistant Санжара...`)
    const { generateAssistantResponse } = await import('@/utils/assistantWebhook')
    const aiResponse = await generateAssistantResponse(
      displayText,
      chat,
      requestId
    )
    
    if (aiResponse) {
      // Отправляем ответ через WhatsApp
      console.log(`📤 [${requestId}] Отправляем ИИ ответ: "${aiResponse}"`)
      
      const whapiService = (await import('@/lib/whapi')).default
      const sent = await whapiService.sendMessage(phoneNumber, aiResponse)
      
      if (sent) {
        // Сохраняем исходящее сообщение в чат
        await prisma.chatMessage.create({
          data: {
            chatId: chat.id,
            direction: 'OUTGOING',
            sender: 'AI Assistant',
            content: aiResponse,
            messageType: 'TEXT',
            status: 'SENT',
            timestamp: new Date(),
            metadata: {
              generated_by_ai: true,
              original_message: displayText
            }
          }
        })
        
        console.log(`✅ [${requestId}] ИИ ответ отправлен и сохранен`)
      } else {
        console.log(`❌ [${requestId}] Не удалось отправить ИИ ответ`)
      }
    }
    
    if (lowerMessage.includes('статус') || lowerMessage.includes('состояние')) {
      console.log(`📊 [${requestId}] Запрос статуса`)
    }
    
  } catch (error) {
    console.error('❌ Ошибка обработки входящего сообщения:', error)
  }
}

/**
 * Определяет, является ли сообщение коммерческим предложением
 */
async function detectQuoteMessage(displayText: string, messageData: any): Promise<boolean> {
  // Ключевые слова для определения КП
  const quoteKeywords = [
    'цена', 'стоимость', 'предложение', 'коммерческое',
    'кп', 'прайс', 'расценки', 'тариф', 'смета',
    'quote', 'price', 'cost', 'offer', 'proposal'
  ]
  
  const hasQuoteKeywords = quoteKeywords.some(keyword => 
    displayText.includes(keyword)
  )
  
  // Проверяем наличие вложений (документы, изображения)
  const hasAttachments = messageData.document || messageData.image || messageData.media
  
  // Проверяем наличие чисел (возможные цены)
  const hasNumbers = /\d+/.test(displayText)
  
  return hasQuoteKeywords || (hasAttachments && hasNumbers)
}

/**
 * Обрабатывает входящий документ (потенциальное КП)
 */
async function handleDocumentMessage(messageData: any, chatId: string, requestId: string) {
  try {
    const document = messageData.document
    const fileName = document?.filename || 'document'
    const mimeType = document?.mime_type || ''
    
    console.log(`📄 [${requestId}] Получен документ: ${fileName} (${mimeType})`)
    
    // Проверяем что это потенциально коммерческое предложение
    const isLikelyCP = isLikelyCommercialOffer(fileName, mimeType)
    
    if (!isLikelyCP) {
      console.log(`⚠️ [${requestId}] Документ не похож на КП: ${fileName}`)
      return
    }
    
    // Для PDF/Word документов caption используется только как fallback
    // Основной парсинг будет происходить в process-document API
    const documentText = document.caption || fileName
    
    console.log(`📝 [${requestId}] Caption документа: "${documentText}" (${documentText.length} символов)`)
    console.log(`📝 [${requestId}] Документ будет скачан и распарсен в process-document API`)
    
    // Отправляем на обработку в отдельный API
    console.log(`📤 [${requestId}] Отправляем документ на обработку в process-document API`)
    console.log(`📤 [${requestId}] URL: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/webhook/process-document`)
    console.log(`📤 [${requestId}] Данные:`, {
      chatId,
      fileName,
      documentTextLength: documentText?.length || 0,
      hasMessageData: !!messageData,
      documentId: messageData.document?.id
    })
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/webhook/process-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatId,
          messageData,
          documentText,
          fileName
        })
      })
      
      console.log(`📥 [${requestId}] Ответ от process-document API: ${response.status} ${response.statusText}`)
      
      if (response.ok) {
        const result = await response.json()
        console.log(`✅ [${requestId}] Документ успешно обработан:`, result)
        
        if (result.readyForAnalysis) {
          console.log(`🤖 [${requestId}] Заявка готова к AI анализу!`)
        }
      } else {
        const errorText = await response.text()
        console.error(`❌ [${requestId}] Ошибка обработки документа:`, response.status, response.statusText)
        console.error(`❌ [${requestId}] Детали ошибки:`, errorText)
      }
    } catch (processError) {
      console.error(`❌ [${requestId}] Ошибка при отправке документа на обработку:`, processError)
      console.error(`❌ [${requestId}] Stack trace:`, processError.stack)
    }
    
  } catch (error) {
    console.error(`❌ [${requestId}] Ошибка обработки документа:`, error)
  }
}

/**
 * Проверяет, похож ли файл на коммерческое предложение
 */
function isLikelyCommercialOffer(fileName: string, mimeType: string): boolean {
  const lowerFileName = fileName.toLowerCase()
  
  // Ключевые слова в названии файла
  const cpKeywords = [
    'кп', 'коммерческое', 'предложение', 'прайс', 'цена', 'стоимость',
    'quote', 'proposal', 'price', 'offer', 'commercial',
    'смета', 'расчет', 'калькуляция', 'тариф'
  ]
  
  const hasKeyword = cpKeywords.some(keyword => lowerFileName.includes(keyword))
  
  // Поддерживаемые типы файлов
  const supportedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]
  
  const isSupportedType = supportedTypes.includes(mimeType) || 
    lowerFileName.endsWith('.pdf') || 
    lowerFileName.endsWith('.doc') || 
    lowerFileName.endsWith('.docx') ||
    lowerFileName.endsWith('.txt')
  
  return hasKeyword || isSupportedType
}

/**
 * Обрабатывает получение коммерческого предложения
 */
async function handleQuoteReceived(chatId: string, displayText: string, messageData: any, requestId: string) {
  try {
    // Находим все позиции, связанные с этим чатом
    const positionChats = await prisma.positionChat.findMany({
      where: { 
        chatId,
        status: { in: ['REQUESTED', 'SENT'] }
      },
      include: {
        position: {
          include: {
            request: true
          }
        }
      }
    })
    
    if (positionChats.length === 0) {
      console.log(`⚠️ [${requestId}] Не найдено активных запросов КП для чата ${chatId}`)
      return
    }
    
    // Обновляем статус всех связанных позиций
    for (const positionChat of positionChats) {
      await prisma.positionChat.update({
        where: { id: positionChat.id },
        data: {
          status: 'RECEIVED',
          quoteReceivedAt: new Date()
        }
      })
      
      // Увеличиваем счетчик полученных КП для позиции
      await prisma.position.update({
        where: { id: positionChat.positionId },
        data: {
          quotesReceived: { increment: 1 },
          searchStatus: 'QUOTES_RECEIVED'
        }
      })
      
      console.log(`✅ [${requestId}] КП получено для позиции: ${positionChat.position.name}`)
    }
    
    // Проверяем, получены ли КП по всем позициям заявки
    const request = positionChats[0].position.request
    await checkRequestQuotesCompletion(request.id, requestId)
    
  } catch (error) {
    console.error('❌ Ошибка обработки получения КП:', error)
  }
}

/**
 * Проверяет, получены ли достаточно КП по заявке для запуска ИИ анализа
 */
async function checkRequestQuotesCompletion(requestId: string, webhookRequestId: string) {
  try {
    // Логика проверки завершенности получения КП
    console.log(`🔍 [${webhookRequestId}] Проверяем завершенность получения КП для заявки ${requestId}`)
    
    // Здесь можно добавить логику для автоматического запуска ИИ анализа
    // когда получено достаточно коммерческих предложений
    
  } catch (error) {
    console.error('❌ Ошибка проверки завершенности КП:', error)
  }
}
