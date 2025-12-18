// API для импорта документа из чата как КП для позиции
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { parsePDFCommercialOffer, parseWordCommercialOffer } from '@/utils/cpParser'

// Функция для скачивания документа через Whapi
async function downloadDocumentFromWhapi(documentId: string): Promise<Buffer | null> {
  try {
    const whapiSetting = await prisma.systemSetting.findUnique({
      where: { key: 'whapi_token' }
    })
    
    if (!whapiSetting?.value) {
      console.error('❌ Whapi token не найден')
      return null
    }
    
    const downloadUrl = `https://gate.whapi.cloud/media/${documentId}`
    
    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${whapiSetting.value}`
      }
    })
    
    if (!response.ok) {
      console.error(`❌ Ошибка скачивания: ${response.status}`)
      return null
    }
    
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('❌ Ошибка скачивания документа:', error)
    return null
  }
}

/**
 * POST /api/requests/[id]/positions/[positionId]/import-from-chat
 * Импортировать документ из чата как коммерческое предложение для позиции
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; positionId: string } }
) {
  try {
    await requireAuth()
    const { id: requestId, positionId } = params
    const body = await request.json()
    const { messageId, chatId, company, totalPrice, currency = 'KZT' } = body

    console.log(`📥 Импорт КП из чата: requestId=${requestId}, positionId=${positionId}, messageId=${messageId}`)

    if (!messageId || !chatId) {
      return NextResponse.json(
        { error: 'Необходимо указать messageId и chatId' },
        { status: 400 }
      )
    }

    // Проверяем существование заявки
    const requestData = await prisma.request.findUnique({
      where: { id: requestId }
    })

    if (!requestData) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      )
    }

    // Проверяем существование позиции
    const position = await prisma.position.findUnique({
      where: { id: positionId }
    })

    if (!position) {
      return NextResponse.json(
        { error: 'Позиция не найдена' },
        { status: 404 }
      )
    }

    // Получаем сообщение с документом
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        chat: true
      }
    })

    if (!message) {
      return NextResponse.json(
        { error: 'Сообщение не найдено' },
        { status: 404 }
      )
    }

    // Извлекаем данные документа
    const documentData = (message.metadata as any)?.whapi_data?.document
    if (!documentData) {
      return NextResponse.json(
        { error: 'Сообщение не содержит документа' },
        { status: 400 }
      )
    }

    const fileName = documentData.filename || documentData.file_name || 'document'
    const mimeType = documentData.mime_type || 'application/octet-stream'
    const documentId = documentData.id
    const supplierName = company || message.chat.contactName || message.chat.phoneNumber

    // Проверяем, не был ли уже импортирован этот документ для ЭТОЙ КОНКРЕТНОЙ позиции
    const existingOffer = await prisma.commercialOffer.findFirst({
      where: {
        chatId: chatId,
        fileName: fileName,
        positionId: positionId
      }
    })

    if (existingOffer) {
      return NextResponse.json(
        { error: 'Этот документ уже был импортирован как КП для данной позиции' },
        { status: 400 }
      )
    }
    
    // Проверяем, был ли этот документ уже распарсен для другой позиции (для переиспользования данных)
    const existingParsedOffer = await prisma.commercialOffer.findFirst({
      where: {
        chatId: chatId,
        fileName: fileName,
        positionId: { not: positionId }
      }
    })

    // Парсим документ автоматически
    let parsedData = {
      totalPrice: totalPrice || null,
      currency: currency || 'KZT',
      company: supplierName,
      positions: JSON.stringify([{
        name: position.name,
        quantity: position.quantity,
        unit: position.unit,
        price: totalPrice || null
      }]),
      confidence: 50,
      needsManualReview: true,
      extractedText: documentData.caption || '',
      deliveryTerm: null as string | null,
      paymentTerm: null as string | null
    }

    // Если документ уже был распарсен для другой позиции, используем те же данные
    if (existingParsedOffer && existingParsedOffer.totalPrice) {
      console.log(`📋 Переиспользуем данные из ранее распарсенного КП`)
      parsedData = {
        totalPrice: totalPrice || existingParsedOffer.totalPrice,
        currency: existingParsedOffer.currency || currency || 'KZT',
        company: company || existingParsedOffer.company || supplierName,
        positions: existingParsedOffer.positions || JSON.stringify([{
          name: position.name,
          quantity: position.quantity,
          unit: position.unit,
          price: existingParsedOffer.totalPrice || totalPrice || null
        }]),
        confidence: existingParsedOffer.confidence || 50,
        needsManualReview: existingParsedOffer.needsManualReview ?? true,
        extractedText: existingParsedOffer.extractedText || '',
        deliveryTerm: existingParsedOffer.deliveryTerm || null,
        paymentTerm: existingParsedOffer.paymentTerm || null
      }
    }
    // Пытаемся скачать и распарсить документ автоматически
    else if (documentId) {
      try {
        console.log(`📥 Скачиваем документ ${fileName} для парсинга...`)
        const fileBuffer = await downloadDocumentFromWhapi(documentId)
        
        if (fileBuffer && fileBuffer.length > 0) {
          console.log(`📄 Документ скачан: ${fileBuffer.length} байт`)
          
          let parseResult
          
          // Парсим в зависимости от типа файла
          if (mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
            console.log(`📄 Парсим как PDF...`)
            parseResult = await parsePDFCommercialOffer(fileBuffer, fileName)
          } else if (mimeType.includes('word') || mimeType.includes('document') || 
                     fileName.toLowerCase().match(/\.(doc|docx)$/)) {
            console.log(`📝 Парсим как Word...`)
            parseResult = await parseWordCommercialOffer(fileBuffer, fileName)
          } else {
            console.log(`📋 Тип файла не поддерживается для автопарсинга: ${mimeType}`)
          }
          
          if (parseResult) {
            console.log(`✅ Документ распарсен! Уверенность: ${parseResult.confidence}%`)
            console.log(`💰 Найдена цена: ${parseResult.totalPrice || 'не найдена'}`)
            console.log(`🏢 Компания: ${parseResult.company || supplierName}`)
            
            parsedData = {
              totalPrice: parseResult.totalPrice || totalPrice || null,
              currency: parseResult.currency || currency || 'KZT',
              company: parseResult.company || supplierName,
              positions: JSON.stringify(parseResult.positions.length > 0 ? parseResult.positions : [{
                name: position.name,
                quantity: position.quantity,
                unit: position.unit,
                price: parseResult.totalPrice || totalPrice || null
              }]),
              confidence: parseResult.confidence,
              needsManualReview: parseResult.needsManualReview,
              extractedText: parseResult.extractedText || '',
              deliveryTerm: parseResult.deliveryTerm || null,
              paymentTerm: parseResult.paymentTerm || null
            }
          }
        }
      } catch (parseError: any) {
        console.error(`⚠️ Ошибка парсинга документа:`, parseError.message)
        // Продолжаем с базовыми данными
      }
    }

    // Создаём коммерческое предложение с распарсенными данными
    const commercialOffer = await prisma.commercialOffer.create({
      data: {
        chatId: chatId,
        requestId: requestId,
        positionId: positionId,
        fileName: fileName,
        mimeType: mimeType,
        company: parsedData.company,
        totalPrice: parsedData.totalPrice,
        currency: parsedData.currency,
        positions: parsedData.positions,
        confidence: parsedData.confidence,
        needsManualReview: parsedData.needsManualReview,
        status: 'RECEIVED',
        extractedText: parsedData.extractedText,
        deliveryTerm: parsedData.deliveryTerm,
        paymentTerm: parsedData.paymentTerm
      }
    })

    // Обновляем счётчик полученных КП для позиции
    await prisma.position.update({
      where: { id: positionId },
      data: {
        quotesReceived: { increment: 1 },
        searchStatus: 'QUOTES_RECEIVED'
      }
    })

    // Обновляем/создаём связь чата с позицией
    await prisma.positionChat.upsert({
      where: {
        positionId_chatId: {
          positionId: positionId,
          chatId: chatId
        }
      },
      create: {
        positionId: positionId,
        chatId: chatId,
        status: 'RECEIVED',
        quoteReceivedAt: new Date()
      },
      update: {
        status: 'RECEIVED',
        quoteReceivedAt: new Date()
      }
    })

    // Привязываем чат к заявке если не привязан
    const chat = await prisma.chat.findUnique({
      where: { id: chatId }
    })
    
    if (chat && !chat.requestId) {
      await prisma.chat.update({
        where: { id: chatId },
        data: { requestId: requestId }
      })
      console.log(`🔗 Чат ${chatId} автоматически привязан к заявке ${requestData.requestNumber}`)
    }

    console.log(`✅ КП импортировано: ${commercialOffer.id} для позиции ${position.name}`)

    return NextResponse.json({
      success: true,
      data: {
        commercialOffer,
        message: `КП от "${supplierName}" успешно импортировано для позиции "${position.name}"`
      }
    })

  } catch (error: any) {
    console.error('❌ Error importing commercial offer from chat:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Ошибка при импорте КП' },
      { status: 500 }
    )
  }
}
