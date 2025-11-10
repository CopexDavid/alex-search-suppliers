// API для управления конкретным пользователем
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hashPassword, logAction, requireRole } from '@/lib/auth'
import { Role } from '../../../../lib/rbac'

// GET /api/users/[id] - получить пользователя по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Только администратор может просматривать пользователей
    const currentUser = await requireRole([Role.ADMIN])

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      )
    }

    // Добавляем информацию о последнем входе
    const userWithLastLogin = {
      ...user,
      lastLogin: user.sessions[0]?.createdAt || null,
      sessions: undefined, // убираем sessions из ответа
    }

    return NextResponse.json({
      success: true,
      data: userWithLastLogin,
    })
  } catch (error: any) {
    console.error('Get user error:', error)

    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при получении пользователя' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id] - обновить пользователя
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Только администратор может редактировать пользователей
    const currentUser = await requireRole([Role.ADMIN])

    const body = await request.json()
    const { email, password, name, role, isActive } = body

    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      )
    }

    // Запрещаем администратору деактивировать самого себя
    if (currentUser.id === params.id && isActive === false) {
      return NextResponse.json(
        { error: 'Нельзя деактивировать собственную учетную запись' },
        { status: 400 }
      )
    }

    // Валидация email, если он изменяется
    if (email && email !== existingUser.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Неверный формат email' },
          { status: 400 }
        )
      }

      // Проверяем, не занят ли новый email
      const emailExists = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      })

      if (emailExists && emailExists.id !== params.id) {
        return NextResponse.json(
          { error: 'Пользователь с таким email уже существует' },
          { status: 409 }
        )
      }
    }

    // Валидация пароля, если он изменяется
    if (password && password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      )
    }

    // Проверка валидности роли
    if (role && !Object.values(Role).includes(role)) {
      return NextResponse.json(
        { error: 'Неверная роль пользователя' },
        { status: 400 }
      )
    }

    // Подготавливаем данные для обновления
    const updateData: any = {}
    
    if (email) updateData.email = email.toLowerCase()
    if (name) updateData.name = name
    if (role) updateData.role = role
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    
    // Хешируем новый пароль, если он предоставлен
    if (password) {
      updateData.password = await hashPassword(password)
    }

    // Обновляем пользователя
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Логирование изменения пользователя
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    await logAction(
      currentUser.id,
      'update_user',
      'user',
      updatedUser.id,
      { 
        email: updatedUser.email, 
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        changedFields: Object.keys(updateData)
      },
      ipAddress || undefined
    )

    return NextResponse.json({
      success: true,
      data: updatedUser,
    })
  } catch (error: any) {
    console.error('Update user error:', error)

    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при обновлении пользователя' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - удалить пользователя
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Только администратор может удалять пользователей
    const currentUser = await requireRole([Role.ADMIN])

    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      )
    }

    // Запрещаем администратору удалить самого себя
    if (currentUser.id === params.id) {
      return NextResponse.json(
        { error: 'Нельзя удалить собственную учетную запись' },
        { status: 400 }
      )
    }

    // Удаляем пользователя (каскадное удаление сессий и других связанных данных)
    await prisma.user.delete({
      where: { id: params.id },
    })

    // Логирование удаления пользователя
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    await logAction(
      currentUser.id,
      'delete_user',
      'user',
      params.id,
      { email: existingUser.email, role: existingUser.role },
      ipAddress || undefined
    )

    return NextResponse.json({
      success: true,
      message: 'Пользователь успешно удален',
    })
  } catch (error: any) {
    console.error('Delete user error:', error)

    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при удалении пользователя' },
      { status: 500 }
    )
  }
}
