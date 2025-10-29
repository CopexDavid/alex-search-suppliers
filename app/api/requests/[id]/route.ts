// API для работы с отдельной заявкой
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { RequestStatus } from '@prisma/client'

// GET /api/requests/[id] - Получить детали заявки
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params

    const requestData = await prisma.request.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        positions: true,
        suppliers: {
          include: {
            supplier: {
              include: {
                contacts: true,
              },
            },
          },
        },
        quotes: {
          include: {
            supplier: {
              include: {
                contacts: true,
              },
            },
            items: true,
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        tasks: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    })

    if (!requestData) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: requestData,
    })
  } catch (error: any) {
    console.error('Get request error:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при получении заявки' },
      { status: 500 }
    )
  }
}

// PUT /api/requests/[id] - Обновить заявку
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params
    const body = await request.json()

    // Проверяем существование заявки
    const existing = await prisma.request.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      )
    }

    const {
      description,
      deadline,
      budget,
      status,
      priority,
    } = body

    // Обновляем заявку
    const updated = await prisma.request.update({
      where: { id },
      data: {
        ...(description !== undefined && { description }),
        ...(deadline !== undefined && { deadline: new Date(deadline) }),
        ...(budget !== undefined && { budget }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        positions: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error: any) {
    console.error('Update request error:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при обновлении заявки' },
      { status: 500 }
    )
  }
}

// DELETE /api/requests/[id] - Удалить заявку (архивировать)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params

    // Проверяем существование заявки
    const existing = await prisma.request.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      )
    }

    // Архивируем вместо удаления
    await prisma.request.update({
      where: { id },
      data: {
        status: RequestStatus.ARCHIVED,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Заявка архивирована',
    })
  } catch (error: any) {
    console.error('Delete request error:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при удалении заявки' },
      { status: 500 }
    )
  }
}

