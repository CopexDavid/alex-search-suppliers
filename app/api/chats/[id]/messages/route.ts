// API для сообщений в чате
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import whapiService from '@/lib/whapi'

/**
 * GET /api/chats/[id]/messages
 * Получить сообщения чата
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const skip = (page - 1) * limit
    
    // Проверяем существование чата
    const chat = await prisma.chat.findUnique({
      where: { id: params.id }
    })
    
    if (!chat) {
      return NextResponse.json(
        { error: 'Чат не найден' },
        { status: 404 }
      )
    }
    
    // Получаем сообщения
    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { chatId: params.id },
        orderBy: { timestamp: 'asc' },
        skip,
        take: limit
      }),
      prisma.chatMessage.count({
        where: { chatId: params.id }
      })
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
    
  } catch (error: any) {
    console.error('❌ Error fetching chat messages:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка при получении сообщений' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chats/[id]/messages
 * Отправить сообщение в чат
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth()
    
    const { content, messageType = 'TEXT' } = await request.json()
    
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Содержимое сообщения обязательно' },
        { status: 400 }
      )
    }
    
    // Проверяем существование чата
    const chat = await prisma.chat.findUnique({
      where: { id: params.id }
    })
    
    if (!chat) {
      return NextResponse.json(
        { error: 'Чат не найден' },
        { status: 404 }
      )
    }
    
    try {
      // Отправляем сообщение через Whapi.Cloud
      const sent = await whapiService.sendMessage(chat.phoneNumber, content.trim())
      
      if (!sent) {
        throw new Error('Не удалось отправить сообщение через WhatsApp')
      }
      
      // Сохраняем сообщение в базу данных
      const message = await prisma.chatMessage.create({
        data: {
          chatId: params.id,
          direction: 'OUTGOING',
          sender: currentUser.name,
          content: content.trim(),
          messageType: messageType as any,
          status: 'SENT',
          timestamp: new Date(),
          metadata: {
            sentBy: currentUser.id,
            sentByName: currentUser.name
          }
        }
      })
      
      // Обновляем последнее сообщение в чате
      await prisma.chat.update({
        where: { id: params.id },
        data: {
          lastMessage: content.trim(),
          lastMessageAt: new Date()
        }
      })
      
      return NextResponse.json({
        success: true,
        data: message
      })
      
    } catch (whatsappError: any) {
      console.error('❌ WhatsApp send error:', whatsappError)
      
      // Сохраняем сообщение как неудачное
      const message = await prisma.chatMessage.create({
        data: {
          chatId: params.id,
          direction: 'OUTGOING',
          sender: currentUser.name,
          content: content.trim(),
          messageType: messageType as any,
          status: 'FAILED',
          timestamp: new Date(),
          metadata: {
            sentBy: currentUser.id,
            sentByName: currentUser.name,
            error: whatsappError.message
          }
        }
      })
      
      return NextResponse.json(
        { 
          error: `Ошибка отправки WhatsApp: ${whatsappError.message}`,
          data: message
        },
        { status: 500 }
      )
    }
    
  } catch (error: any) {
    console.error('❌ Error sending message:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка при отправке сообщения' },
      { status: 500 }
    )
  }
}
