// API для управления системными настройками
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/settings/system
 * Получение системных настроек
 */
export async function GET() {
  try {
    const user = await requireAuth()
    
    // Только администраторы могут управлять системными настройками
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Недостаточно прав доступа' },
        { status: 403 }
      )
    }

    // Получаем все системные настройки
    const settings = await prisma.systemSetting.findMany()
    
    // Преобразуем в удобный формат
    const settingsMap: Record<string, any> = {}
    for (const setting of settings) {
      let value = setting.value
      
      // Преобразуем типы
      if (setting.type === 'number') {
        value = parseFloat(setting.value)
      } else if (setting.type === 'boolean') {
        value = setting.value === 'true'
      }
      
      settingsMap[setting.key] = value
    }

    return NextResponse.json(settingsMap)
    
  } catch (error: any) {
    console.error('Ошибка получения системных настроек:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/system
 * Сохранение системных настроек
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Только администраторы могут управлять системными настройками
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Недостаточно прав доступа' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Валидация настроек
    const updates: Array<{key: string, value: string, type: string}> = []
    
    // Количество поставщиков для контакта
    if (body.suppliers_to_contact !== undefined) {
      const count = parseInt(body.suppliers_to_contact)
      if (isNaN(count) || count < 1 || count > 10) {
        return NextResponse.json(
          { error: 'Количество поставщиков должно быть от 1 до 10' },
          { status: 400 }
        )
      }
      updates.push({
        key: 'suppliers_to_contact',
        value: count.toString(),
        type: 'number'
      })
    }

    // Сохраняем настройки в базу данных
    for (const update of updates) {
      await prisma.systemSetting.upsert({
        where: { key: update.key },
        update: {
          value: update.value,
          type: update.type,
          updatedAt: new Date()
        },
        create: {
          key: update.key,
          value: update.value,
          type: update.type
        }
      })
    }

    console.log(`✅ Системные настройки обновлены пользователем ${user.email}`)

    return NextResponse.json({ 
      success: true,
      message: 'Настройки успешно сохранены'
    })
    
  } catch (error: any) {
    console.error('Ошибка сохранения системных настроек:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
