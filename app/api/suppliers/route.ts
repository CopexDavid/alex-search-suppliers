// API для работы с поставщиками
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/suppliers - Получить список поставщиков
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    // Фильтры
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const hasContract = searchParams.get('hasContract')
    const isActive = searchParams.get('isActive')
    const limit = parseInt(searchParams.get('limit') || '25')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Строим запрос с фильтрами
    const where: any = {}
    
    // Фильтр по активности
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    } else {
      where.isActive = true // По умолчанию показываем только активных
    }
    
    // Поиск по названию, email, телефону
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    // Фильтр по категории (через теги)
    if (category && category !== 'все') {
      where.tags = {
        has: category
      }
    }
    
    // Фильтр по наличию договора
    if (hasContract && hasContract !== 'все') {
      if (hasContract === 'с договором') {
        where.contractValidTo = {
          gte: new Date() // Договор действующий
        }
      } else if (hasContract === 'без договора') {
        where.OR = [
          { contractValidTo: null },
          { contractValidTo: { lt: new Date() } } // Договор истек
        ]
      }
    }

    // Получаем поставщиков
    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          contacts: true,
          _count: {
            select: {
              quotes: true,
              requests: true,
            },
          },
        },
        orderBy: [
          { rating: 'desc' },
          { name: 'asc' }
        ],
        take: limit,
        skip: offset,
      }),
      prisma.supplier.count({ where }),
    ])

    // Получаем все уникальные теги для фильтра категорий
    const allSuppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      select: { tags: true }
    })
    
    const allTags = [...new Set(allSuppliers.flatMap(s => s.tags))].sort()

    return NextResponse.json({
      success: true,
      data: suppliers,
      categories: allTags,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error: any) {
    console.error('Get suppliers error:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при получении списка поставщиков' },
      { status: 500 }
    )
  }
}

// POST /api/suppliers - Создать нового поставщика
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    
    const {
      name,
      inn,
      address,
      email,
      phone,
      whatsapp,
      website,
      description,
      tags = null,
      contractValidTo
    } = body

    // Валидация обязательных полей
    if (!name) {
      return NextResponse.json(
        { error: 'Название поставщика обязательно' },
        { status: 400 }
      )
    }

    // Проверяем уникальность ИНН если указан
    if (inn) {
      const existingSupplier = await prisma.supplier.findUnique({
        where: { inn }
      })
      
      if (existingSupplier) {
        return NextResponse.json(
          { error: 'Поставщик с таким ИНН уже существует' },
          { status: 400 }
        )
      }
    }

    // Создаем поставщика
    const supplier = await prisma.supplier.create({
      data: {
        name,
        inn: inn || undefined,
        address: address || undefined,
        email: email || undefined,
        phone: phone || undefined,
        whatsapp: whatsapp || undefined,
        website: website || undefined,
        description: description || undefined,
        tags: tags || null,
        contractValidTo: contractValidTo ? new Date(contractValidTo) : undefined,
        rating: 0,
        isActive: true,
      },
      include: {
        contacts: true,
        _count: {
          select: {
            quotes: true,
            requests: true,
          },
        },
      },
    })

    // Создаем audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_SUPPLIER',
        entity: 'Supplier',
        entityId: supplier.id,
        details: {
          name: supplier.name,
          inn: supplier.inn,
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: supplier,
    })
  } catch (error: any) {
    console.error('Create supplier error:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при создании поставщика' },
      { status: 500 }
    )
  }
}
