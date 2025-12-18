// API для получения документов из чатов заявки
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/requests/[id]/chat-documents
 * Получить все документы из чатов, связанных с заявкой
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    const requestId = params.id

    // Получаем заявку с чатами
    const requestData = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        chats: {
          include: {
            messages: {
              where: {
                messageType: 'DOCUMENT'
              },
              orderBy: { timestamp: 'desc' }
            }
          }
        },
        // Также получаем чаты через positionChats
        positions: {
          include: {
            positionChats: {
              include: {
                chat: {
                  include: {
                    messages: {
                      where: {
                        messageType: 'DOCUMENT'
                      },
                      orderBy: { timestamp: 'desc' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!requestData) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      )
    }

    // Собираем все документы из всех чатов
    const documentsMap = new Map<string, any>()

    // Документы из прямых чатов заявки
    for (const chat of requestData.chats) {
      for (const message of chat.messages) {
        const documentData = (message.metadata as any)?.whapi_data?.document
        if (documentData) {
          documentsMap.set(message.id, {
            messageId: message.id,
            chatId: chat.id,
            chatPhone: chat.phoneNumber,
            chatName: chat.contactName,
            fileName: documentData.filename || documentData.file_name || 'document',
            mimeType: documentData.mime_type || '',
            fileSize: documentData.file_size || 0,
            documentId: documentData.id,
            caption: documentData.caption,
            timestamp: message.timestamp,
            direction: message.direction
          })
        }
      }
    }

    // Документы из чатов через позиции
    for (const position of requestData.positions) {
      for (const positionChat of position.positionChats) {
        for (const message of positionChat.chat.messages) {
          const documentData = (message.metadata as any)?.whapi_data?.document
          if (documentData && !documentsMap.has(message.id)) {
            documentsMap.set(message.id, {
              messageId: message.id,
              chatId: positionChat.chat.id,
              chatPhone: positionChat.chat.phoneNumber,
              chatName: positionChat.chat.contactName,
              positionId: position.id,
              positionName: position.name,
              fileName: documentData.filename || documentData.file_name || 'document',
              mimeType: documentData.mime_type || '',
              fileSize: documentData.file_size || 0,
              documentId: documentData.id,
              caption: documentData.caption,
              timestamp: message.timestamp,
              direction: message.direction
            })
          }
        }
      }
    }

    // Преобразуем в массив и сортируем по дате
    const documents = Array.from(documentsMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    console.log(`📄 Найдено ${documents.length} документов в чатах для заявки ${requestData.requestNumber}`)

    return NextResponse.json({
      success: true,
      data: {
        requestNumber: requestData.requestNumber,
        documents
      }
    })

  } catch (error: any) {
    console.error('❌ Error fetching chat documents:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка при получении документов' },
      { status: 500 }
    )
  }
}
