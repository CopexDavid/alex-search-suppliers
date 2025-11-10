// API для обработки документов из WhatsApp webhook (новая версия)
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { parseDocument } from '@/utils/documentParser'
import { CommercialOfferStatus, RequestStatus } from '@prisma/client'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * POST /api/whatsapp/webhook/process-document
 * Обработка входящих документов от поставщиков
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `doc_${startTime}`
  
  try {
    const body = await request.json()
    const { chatId, messageData, fileName } = body
    
    console.log(`📄 [${requestId}] Обработка документа: ${fileName}`)
    
    // Находим чат и связанную заявку
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        request: {
          include: {
            positions: true
          }
        }
      }
    })

    if (!chat) {
      console.log(`⚠️ [${requestId}] Чат не найден: ${chatId}`)
      return NextResponse.json({ error: 'Чат не найден' }, { status: 404 })
    }

    if (!chat.request) {
      console.log(`⚠️ [${requestId}] Чат не привязан к заявке`)
      return NextResponse.json({ error: 'Чат не привязан к заявке' }, { status: 400 })
    }

    console.log(`🔗 [${requestId}] Чат привязан к заявке: ${chat.request.requestNumber}`)

    // Проверяем наличие OpenAI API ключа
    const openaiSetting = await prisma.systemSetting.findUnique({
      where: { key: 'openai_api_key' }
    })
    
    if (!openaiSetting?.value || openaiSetting.value === 'sk-your-openai-api-key-here') {
      console.log(`⚠️ [${requestId}] OpenAI API ключ не настроен`)
      return NextResponse.json({ 
        error: 'OpenAI API ключ не настроен. Обратитесь к администратору.' 
      }, { status: 500 })
    }

    const document = messageData.document
    const mimeType = document?.mime_type || ''
    
    console.log(`📄 [${requestId}] Тип документа: ${mimeType}`)
    
    // Поддерживаемые типы документов
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]
    
    if (!supportedTypes.includes(mimeType)) {
      console.log(`⚠️ [${requestId}] Неподдерживаемый тип документа: ${mimeType}`)
      return NextResponse.json({ 
        error: `Неподдерживаемый тип документа: ${mimeType}` 
      }, { status: 400 })
    }

    // Скачиваем документ
    console.log(`📥 [${requestId}] Скачиваем документ...`)
    const documentBuffer = await downloadDocument(document.id, requestId)
    
    // Сохраняем документ для отладки и прикрепления к заявке
    const savedDocumentPath = await saveDocument(documentBuffer, fileName, requestId)
    
    // Парсим документ с помощью нового парсера
    console.log(`🔍 [${requestId}] Парсим документ...`)
    const parsedDocument = await parseDocument(documentBuffer, fileName, mimeType)
    
    // Создаем коммерческое предложение в базе данных
    console.log(`💾 [${requestId}] Сохраняем результат в базу данных...`)
    const commercialOffer = await prisma.commercialOffer.create({
      data: {
        chatId: chatId,
        requestId: chat.requestId,
        fileName: fileName,
        filePath: savedDocumentPath,
        mimeType: mimeType,
        
        // Основная информация
        totalPrice: parsedDocument.totalPrice,
        currency: parsedDocument.currency,
        company: parsedDocument.company,
        
        // Дополнительная информация
        deliveryTerm: parsedDocument.deliveryTerm,
        paymentTerm: parsedDocument.paymentTerm,
        validUntil: parsedDocument.validUntil,
        
        // Метаданные
        confidence: parsedDocument.confidence,
        needsManualReview: parsedDocument.needsManualReview,
        extractedText: parsedDocument.extractedText,
        
        // Позиции (сохраняем как JSON)
        positions: JSON.stringify(parsedDocument.positions),
        
        // Статус
        status: parsedDocument.needsManualReview ? CommercialOfferStatus.REVIEWING : CommercialOfferStatus.RECEIVED,
        
        createdAt: new Date()
      }
    })
    
    console.log(`✅ [${requestId}] Коммерческое предложение сохранено с ID: ${commercialOffer.id}`)
    
    // Обновляем счетчик КП для всех позиций в заявке
    await updateQuotesReceived(chat.requestId)
    
    // Проверяем готовность к анализу заявки
    const isReadyForAnalysis = await checkReadyForAnalysis(chat.requestId)
    
    const response = {
      success: true,
      requestId,
      commercialOfferId: commercialOffer.id,
      parsedData: {
        totalPrice: parsedDocument.totalPrice,
        currency: parsedDocument.currency,
        company: parsedDocument.company,
        positionsCount: parsedDocument.positions.length,
        confidence: parsedDocument.confidence,
        needsManualReview: parsedDocument.needsManualReview
      },
      isReadyForAnalysis,
      processingTime: Date.now() - startTime
    }
    
    console.log(`🎉 [${requestId}] Документ успешно обработан за ${response.processingTime}мс`)
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error(`❌ [${requestId}] Ошибка обработки документа:`, error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      requestId,
      processingTime: Date.now() - startTime
    }, { status: 500 })
  }
}

/**
 * Скачивает документ через Whapi API
 */
async function downloadDocument(documentId: string, requestId: string): Promise<Buffer> {
  // Получаем токен Whapi из настроек
  const whapiSetting = await prisma.systemSetting.findUnique({
    where: { key: 'whapi_token' }
  })
  
  if (!whapiSetting?.value) {
    throw new Error('Whapi token не найден в настройках')
  }
  
  // Скачиваем файл через Whapi API
  const downloadUrl = `https://gate.whapi.cloud/media/${documentId}`
  
  const response = await fetch(downloadUrl, {
    headers: {
      'Authorization': `Bearer ${whapiSetting.value}`
    }
  })
  
  if (!response.ok) {
    throw new Error(`Ошибка скачивания документа: ${response.statusText}`)
  }
  
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  console.log(`📄 [${requestId}] Документ скачан, размер: ${buffer.length} байт`)
  
  return buffer
}

/**
 * Сохраняет документ на диск для прикрепления к заявке
 */
async function saveDocument(buffer: Buffer, fileName: string, requestId: string): Promise<string> {
  try {
    // Создаем папку для документов если не существует
    const documentsDir = join(process.cwd(), 'uploaded-documents')
    if (!existsSync(documentsDir)) {
      mkdirSync(documentsDir, { recursive: true })
    }
    
    // Создаем безопасное имя файла
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = join(documentsDir, `${requestId}_${safeName}`)
    
    // Сохраняем файл
    writeFileSync(filePath, buffer)
    
    console.log(`💾 Документ сохранен: ${filePath}`)
    
    return filePath
    
  } catch (error) {
    console.error('❌ Ошибка сохранения документа:', error)
    throw new Error(`Не удалось сохранить документ: ${error.message}`)
  }
}

/**
 * Проверяет готовность заявки к анализу и обновляет статус
 */
async function checkReadyForAnalysis(requestId: string): Promise<boolean> {
  const commercialOffers = await prisma.commercialOffer.findMany({
    where: { requestId }
  })
  
  // Считаем заявку готовой если есть хотя бы одно КП с хорошей уверенностью
  const goodOffers = commercialOffers.filter(offer => 
    offer.confidence >= 70 && !offer.needsManualReview
  )
  
  const isReady = goodOffers.length > 0
  
  if (isReady) {
    // Обновляем статус заявки на COMPARING если она готова к анализу
    const currentRequest = await prisma.request.findUnique({
      where: { id: requestId },
      select: { status: true }
    })
    
    if (currentRequest && currentRequest.status !== RequestStatus.COMPARING && currentRequest.status !== RequestStatus.COMPLETED) {
      await prisma.request.update({
        where: { id: requestId },
        data: { status: RequestStatus.COMPARING }
      })
      console.log(`📊 Заявка ${requestId} переведена в статус COMPARING - готова к ИИ анализу`)
    }
  }
  
  return isReady
}

/**
 * Обновляет счетчик полученных КП для всех позиций в заявке
 */
async function updateQuotesReceived(requestId: string): Promise<void> {
  try {
    // Получаем количество КП для заявки
    const quotesCount = await prisma.commercialOffer.count({
      where: { 
        requestId,
        confidence: { gte: 70 }, // Считаем только качественные КП
        needsManualReview: false
      }
    })
    
    // Обновляем все позиции в заявке
    await prisma.position.updateMany({
      where: { requestId },
      data: { quotesReceived: quotesCount }
    })
    
    console.log(`📊 Обновлен счетчик КП для заявки ${requestId}: ${quotesCount} КП`)
    
  } catch (error) {
    console.error('❌ Ошибка обновления счетчика КП:', error)
  }
}