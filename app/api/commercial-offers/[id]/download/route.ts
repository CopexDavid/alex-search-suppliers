// API для скачивания файла коммерческого предложения
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * GET /api/commercial-offers/[id]/download
 * Скачивание файла коммерческого предложения
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params

    // Получаем КП
    const commercialOffer = await prisma.commercialOffer.findUnique({
      where: { id }
    })

    if (!commercialOffer) {
      return NextResponse.json(
        { error: 'Коммерческое предложение не найдено' },
        { status: 404 }
      )
    }

    // Проверяем наличие файла
    if (!commercialOffer.filePath) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 404 }
      )
    }

    // Проверяем существование файла на диске
    const filePath = commercialOffer.filePath.startsWith('/')
      ? commercialOffer.filePath
      : join(process.cwd(), commercialOffer.filePath)

    if (!existsSync(filePath)) {
      console.error(`❌ Файл не найден: ${filePath}`)
      return NextResponse.json(
        { error: 'Файл не найден на сервере' },
        { status: 404 }
      )
    }

    // Читаем файл
    const fileBuffer = readFileSync(filePath)
    
    // Определяем Content-Type по mimeType
    const contentType = commercialOffer.mimeType || 'application/pdf'
    
    // Формируем имя файла для скачивания
    const fileName = commercialOffer.fileName || 'commercial-offer.pdf'

    console.log(`📥 Скачивание файла КП ${id}: ${fileName}`)

    // Возвращаем файл
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`
      }
    })

  } catch (error: any) {
    console.error('❌ Ошибка скачивания файла КП:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

