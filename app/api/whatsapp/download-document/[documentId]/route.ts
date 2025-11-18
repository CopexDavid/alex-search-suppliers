// API для скачивания документов из WhatsApp
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/whatsapp/download-document/[documentId]
 * Скачивание документа по ID через Whapi API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const { documentId } = params
  
  try {
    console.log(`📥 Запрос на скачивание документа: ${documentId}`)
    
    // Получаем токен Whapi из настроек
    const whapiSetting = await prisma.systemSetting.findUnique({
      where: { key: 'whapi_token' }
    })
    
    if (!whapiSetting?.value) {
      console.error('❌ Whapi token не найден в настройках')
      return NextResponse.json({ error: 'Whapi token не настроен' }, { status: 500 })
    }
    
    // Скачиваем файл через Whapi API
    const downloadUrl = `https://gate.whapi.cloud/media/${documentId}`
    
    console.log(`📤 Запрос к Whapi API: ${downloadUrl}`)
    
    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${whapiSetting.value}`
      }
    })
    
    if (!response.ok) {
      console.error(`❌ Ошибка скачивания документа: ${response.status} ${response.statusText}`)
      return NextResponse.json({ 
        error: `Ошибка скачивания документа: ${response.statusText}` 
      }, { status: response.status })
    }
    
    // Получаем данные файла
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Получаем заголовки для определения типа файла
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const contentDisposition = response.headers.get('content-disposition')
    
    console.log(`✅ Документ скачан, размер: ${buffer.length} байт, тип: ${contentType}`)
    
    // Возвращаем файл клиенту
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        ...(contentDisposition && { 'Content-Disposition': contentDisposition })
      }
    })
    
  } catch (error: any) {
    console.error(`❌ Ошибка при скачивании документа ${documentId}:`, error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}