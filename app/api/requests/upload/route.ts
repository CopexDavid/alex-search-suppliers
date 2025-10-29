// API для загрузки и импорта Excel файла заявки
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { parseExcelRequest } from '@/utils/excelParser'
import { RequestStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'Файл не предоставлен' },
        { status: 400 }
      )
    }

    // Проверка типа файла
    const fileType = file.type
    const fileName = file.name.toLowerCase()
    
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Поддерживаются только файлы Excel (.xlsx, .xls)' },
        { status: 400 }
      )
    }

    // Читаем файл
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Парсим Excel
    const parsedData = await parseExcelRequest(buffer)

    // Проверяем уникальность номера заявки
    const existing = await prisma.request.findUnique({
      where: { requestNumber: parsedData.requestNumber },
    })

    if (existing) {
      return NextResponse.json(
        { 
          error: 'Заявка с таким номером уже существует',
          existingId: existing.id 
        },
        { status: 409 }
      )
    }

    // Создаем заявку в БД
    const newRequest = await prisma.request.create({
      data: {
        requestNumber: parsedData.requestNumber,
        description: parsedData.description || `Заявка ${parsedData.requestNumber}`,
        deadline: parsedData.deadline,
        budget: parsedData.budget,
        currency: parsedData.currency || 'KZT',
        priority: parsedData.priority || 0,
        creatorId: user.id,
        status: RequestStatus.UPLOADED,
        originalFile: fileName,
        positions: {
          create: parsedData.positions.map((pos) => ({
            sku: pos.sku || '',
            name: pos.name,
            description: pos.description,
            quantity: pos.quantity,
            unit: pos.unit,
          })),
        },
      },
      include: {
        positions: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Заявка успешно импортирована',
        data: newRequest,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Upload request error:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    if (error.message.includes('Parse error')) {
      return NextResponse.json(
        { error: `Ошибка парсинга файла: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при загрузке заявки' },
      { status: 500 }
    )
  }
}

