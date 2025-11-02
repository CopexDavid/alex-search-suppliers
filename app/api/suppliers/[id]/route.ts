// API для работы с отдельным поставщиком
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/suppliers/[id] - Получить детали поставщика
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        contacts: true,
        quotes: {
          include: {
            request: {
              select: {
                id: true,
                requestNumber: true,
                description: true,
                createdAt: true,
              },
            },
            items: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        requests: {
          include: {
            request: {
              select: {
                id: true,
                requestNumber: true,
                description: true,
                status: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            quotes: true,
            requests: true,
          },
        },
      },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Поставщик не найден' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: supplier,
    })
  } catch (error: any) {
    console.error('Get supplier error:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при получении поставщика' },
      { status: 500 }
    )
  }
}

// PUT /api/suppliers/[id] - Обновить поставщика
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params
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
      tags,
      contractValidTo,
      rating,
      isActive
    } = body

    // Проверяем существование поставщика
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id }
    })

    if (!existingSupplier) {
      return NextResponse.json(
        { error: 'Поставщик не найден' },
        { status: 404 }
      )
    }

    // Проверяем уникальность ИНН если он изменился
    if (inn && inn !== existingSupplier.inn) {
      const supplierWithSameInn = await prisma.supplier.findUnique({
        where: { inn }
      })
      
      if (supplierWithSameInn) {
        return NextResponse.json(
          { error: 'Поставщик с таким ИНН уже существует' },
          { status: 400 }
        )
      }
    }

    // Обновляем поставщика
    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(inn !== undefined && { inn: inn || null }),
        ...(address !== undefined && { address: address || null }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(whatsapp !== undefined && { whatsapp: whatsapp || null }),
        ...(website !== undefined && { website: website || null }),
        ...(description !== undefined && { description: description || null }),
        ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
        ...(contractValidTo !== undefined && { 
          contractValidTo: contractValidTo ? new Date(contractValidTo) : null 
        }),
        ...(rating !== undefined && { rating: Number(rating) || 0 }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        updatedAt: new Date(),
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
        action: 'UPDATE_SUPPLIER',
        entity: 'Supplier',
        entityId: id,
        details: {
          name: updatedSupplier.name,
          changes: Object.keys(body),
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedSupplier,
    })
  } catch (error: any) {
    console.error('Update supplier error:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при обновлении поставщика' },
      { status: 500 }
    )
  }
}

// DELETE /api/suppliers/[id] - Удалить поставщика (мягкое удаление)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params

    // Проверяем существование поставщика
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            quotes: true,
            requests: true,
          },
        },
      },
    })

    if (!existingSupplier) {
      return NextResponse.json(
        { error: 'Поставщик не найден' },
        { status: 404 }
      )
    }

    // Проверяем, есть ли связанные данные
    if (existingSupplier._count.quotes > 0 || existingSupplier._count.requests > 0) {
      // Мягкое удаление - деактивируем поставщика
      const deactivatedSupplier = await prisma.supplier.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      })

      // Создаем audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DEACTIVATE_SUPPLIER',
          entity: 'Supplier',
          entityId: id,
          details: {
            name: existingSupplier.name,
            reason: 'Has related quotes or requests',
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Поставщик деактивирован (есть связанные заявки/коммерческие предложения)',
        data: deactivatedSupplier,
      })
    } else {
      // Полное удаление если нет связанных данных
      await prisma.supplier.delete({
        where: { id },
      })

      // Создаем audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DELETE_SUPPLIER',
          entity: 'Supplier',
          entityId: id,
          details: {
            name: existingSupplier.name,
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Поставщик удален',
      })
    }
  } catch (error: any) {
    console.error('Delete supplier error:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при удалении поставщика' },
      { status: 500 }
    )
  }
}
