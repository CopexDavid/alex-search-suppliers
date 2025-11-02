// Webhook для получения входящих сообщений от Whapi.Cloud
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * POST /api/whatsapp/webhook
 * Обработчик webhook для входящих сообщений от Whapi.Cloud
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('📨 Получен webhook от Whapi.Cloud:', JSON.stringify(body, null, 2))
    
    // Проверяем тип события
    if (body.type === 'message' && body.data) {
      const messageData = body.data
      
      // Извлекаем информацию о сообщении
      const {
        id: messageId,
        from,
        body: messageText,
        timestamp,
        type: messageType,
        chat_id: chatId
      } = messageData
      
      // Форматируем номер телефона (убираем @c.us или @s.whatsapp.net)
      const phoneNumber = from ? from.replace(/@.*/, '') : null
      
      console.log(`📱 Входящее сообщение от ${phoneNumber}: ${messageText}`)
      
      // Сохраняем сообщение в базу данных
      if (phoneNumber && messageText) {
        try {
          // Находим или создаем чат
          let chat = await prisma.chat.findUnique({
            where: { phoneNumber }
          })
          
          if (!chat) {
            // Создаем новый чат
            chat = await prisma.chat.create({
              data: {
                phoneNumber,
                contactName: phoneNumber, // Пока используем номер как имя
                status: 'ACTIVE',
                lastMessage: messageText,
                lastMessageAt: new Date(),
                unreadCount: 1
              }
            })
            console.log(`📱 Создан новый чат для ${phoneNumber}`)
          } else {
            // Обновляем существующий чат
            await prisma.chat.update({
              where: { id: chat.id },
              data: {
                lastMessage: messageText,
                lastMessageAt: new Date(),
                unreadCount: { increment: 1 }
              }
            })
          }
          
          // Сохраняем сообщение в чат
          await prisma.chatMessage.create({
            data: {
              chatId: chat.id,
              messageId: messageId || `whapi_${Date.now()}`,
              direction: 'INCOMING',
              content: messageText,
              messageType: messageType === 'text' ? 'TEXT' : 'DOCUMENT',
              status: 'DELIVERED',
              timestamp: timestamp ? new Date(timestamp * 1000) : new Date(),
              metadata: {
                source: 'whapi',
                rawData: body
              }
            }
          })
          
          // Также сохраняем в старую таблицу для совместимости
          await prisma.incomingMessage.create({
            data: {
              messageId: messageId || `whapi_${Date.now()}`,
              phoneNumber,
              message: messageText,
              messageType: messageType || 'text',
              chatId: chatId || phoneNumber,
              timestamp: timestamp ? new Date(timestamp * 1000) : new Date(),
              source: 'whapi',
              rawData: body
            }
          })
          
          console.log('✅ Сообщение сохранено в чат и базу данных')
        } catch (dbError) {
          console.error('❌ Ошибка сохранения в БД:', dbError)
        }
      }
      
      // Обрабатываем входящее сообщение для распознавания КП
      await handleIncomingMessage(phoneNumber, messageText, messageData, chat.id)
    }
    
    // Возвращаем успешный ответ
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('❌ Ошибка обработки webhook:', error)
    
    // Возвращаем успешный ответ даже при ошибке, чтобы Whapi.Cloud не повторял запрос
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    })
  }
}

/**
 * GET /api/whatsapp/webhook
 * Проверка доступности webhook (для тестирования)
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'WhatsApp webhook is ready to receive messages',
    timestamp: new Date().toISOString()
  })
}

/**
 * Обработка входящего сообщения
 */
async function handleIncomingMessage(
  phoneNumber: string | null, 
  messageText: string, 
  messageData: any,
  chatId: string
) {
  try {
    if (!phoneNumber || !messageText) return
    
    console.log(`🤖 Обрабатываем сообщение от ${phoneNumber}: "${messageText}"`)
    
    const lowerMessage = messageText.toLowerCase().trim()
    
    // Проверяем, является ли это коммерческим предложением
    const isQuoteMessage = await detectQuoteMessage(lowerMessage, messageData)
    
    if (isQuoteMessage) {
      console.log('💼 Обнаружено коммерческое предложение!')
      await handleQuoteReceived(chatId, messageText, messageData)
    }
    
    // Простые автоответы
    if (lowerMessage === 'привет' || lowerMessage === 'hello' || lowerMessage === 'hi') {
      console.log('👋 Получено приветствие')
    }
    
    if (lowerMessage.includes('заявка') || lowerMessage.includes('запрос')) {
      console.log('📋 Сообщение содержит упоминание заявки')
    }
    
    if (lowerMessage.includes('статус') || lowerMessage.includes('состояние')) {
      console.log('📊 Запрос статуса')
    }
    
  } catch (error) {
    console.error('❌ Ошибка обработки входящего сообщения:', error)
  }
}

/**
 * Определяет, является ли сообщение коммерческим предложением
 */
async function detectQuoteMessage(messageText: string, messageData: any): Promise<boolean> {
  // Ключевые слова для определения КП
  const quoteKeywords = [
    'коммерческое предложение',
    'кп',
    'предложение',
    'цена',
    'стоимость',
    'прайс',
    'расчет',
    'смета',
    'тенге',
    'тг',
    'руб',
    'доллар',
    'евро'
  ]
  
  // Проверяем текст на ключевые слова
  const hasQuoteKeywords = quoteKeywords.some(keyword => 
    messageText.includes(keyword)
  )
  
  // Проверяем, есть ли вложения (документы)
  const hasAttachments = messageData.type === 'document' || 
                        messageData.type === 'image' ||
                        (messageData.attachments && messageData.attachments.length > 0)
  
  // Проверяем на числовые значения (цены)
  const hasNumbers = /\d+/.test(messageText)
  
  return hasQuoteKeywords || (hasAttachments && hasNumbers)
}

/**
 * Обрабатывает получение коммерческого предложения
 */
async function handleQuoteReceived(chatId: string, messageText: string, messageData: any) {
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
      console.log('⚠️ Не найдено активных запросов КП для этого чата')
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
      
      console.log(`✅ КП получено для позиции: ${positionChat.position.name}`)
    }
    
    // Проверяем, получены ли КП по всем позициям заявки
    const request = positionChats[0].position.request
    await checkRequestQuotesCompletion(request.id)
    
  } catch (error) {
    console.error('❌ Ошибка обработки получения КП:', error)
  }
}

/**
 * Проверяет, получены ли достаточно КП по заявке для запуска ИИ анализа
 */
async function checkRequestQuotesCompletion(requestId: string) {
  try {
    const positions = await prisma.position.findMany({
      where: { requestId },
      include: {
        positionChats: true
      }
    })
    
    let readyForAnalysis = true
    
    for (const position of positions) {
      // Проверяем, что по позиции получено минимум 3 КП
      if (position.quotesReceived < 3) {
        readyForAnalysis = false
        break
      }
    }
    
    if (readyForAnalysis) {
      console.log('🤖 Запускаем ИИ анализ заявки')
      
      // Обновляем статус заявки
      await prisma.request.update({
        where: { id: requestId },
        data: { status: 'COMPARING' }
      })
      
      // Обновляем статус позиций
      await prisma.position.updateMany({
        where: { requestId },
        data: { searchStatus: 'AI_ANALYZED' }
      })
      
      // Здесь можно запустить ИИ анализ
      // await runAIAnalysis(requestId)
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки готовности к анализу:', error)
  }
}
