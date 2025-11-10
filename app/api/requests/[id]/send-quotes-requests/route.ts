// API для автоматической отправки запросов КП поставщикам
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import whapiService from '@/lib/whapi'
import openaiService from '@/lib/openai'
import { selectBestSuppliers, getSuppliersToContactCount } from '@/utils/supplierSelector'

/**
 * POST /api/requests/[id]/send-quotes-requests
 * Автоматическая отправка запросов КП по всем позициям заявки
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth()
    
    // Получаем заявку с позициями и поставщиками
    const requestData = await prisma.request.findUnique({
      where: { id: params.id },
      include: {
        positions: {
          include: {
            positionChats: {
              include: {
                chat: {
                  include: {
                    assignedUser: true
                  }
                }
              }
            }
          }
        },
        suppliers: {
          include: {
            supplier: true
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

    const results = []
    let totalSent = 0

    // Для каждой позиции отправляем запросы лучшим поставщикам (выбранным через ИИ)
    for (const position of requestData.positions) {
      console.log(`📋 Обрабатываем позицию: ${position.name}`)
      
      // Получаем настройку количества поставщиков
      const maxSuppliers = await getSuppliersToContactCount()
      console.log(`🎯 Будем контактировать с ${maxSuppliers} лучшими поставщиками`)
      
      // Подготавливаем кандидатов для ИИ анализа - только поставщики, найденные для этой позиции
      let candidates = requestData.suppliers
        .filter(rs => 
          rs.supplier.whatsapp && // Только с WhatsApp
          rs.foundVia?.includes(`auto-search-${position.name}`) // Только найденные для этой позиции
        )
        .map(rs => ({
          id: rs.supplier.id,
          name: rs.supplier.name,
          description: rs.supplier.description,
          website: rs.supplier.website,
          address: rs.supplier.address,
          tags: rs.supplier.tags,
          rating: rs.supplier.rating,
          foundVia: rs.foundVia || 'search',
          searchRelevance: 0.8, // Базовая релевантность поиска
          contacts: {
            email: rs.supplier.email,
            phone: rs.supplier.phone,
            whatsapp: rs.supplier.whatsapp
          }
        }))
      
      // Если нет специфичных поставщиков для позиции, используем всех доступных
      if (candidates.length === 0) {
        console.log(`⚠️ Нет специфичных поставщиков для позиции: ${position.name}, используем всех доступных`)
        
        candidates = requestData.suppliers
          .filter(rs => rs.supplier.whatsapp) // Только с WhatsApp
          .map(rs => ({
            id: rs.supplier.id,
            name: rs.supplier.name,
            description: rs.supplier.description,
            website: rs.supplier.website,
            address: rs.supplier.address,
            tags: rs.supplier.tags,
            rating: rs.supplier.rating,
            foundVia: rs.foundVia || 'search',
            searchRelevance: 0.5, // Пониженная релевантность для fallback
            contacts: {
              email: rs.supplier.email,
              phone: rs.supplier.phone,
              whatsapp: rs.supplier.whatsapp
            }
          }))
        
        if (candidates.length === 0) {
          console.log(`⚠️ Нет поставщиков с WhatsApp вообще для позиции: ${position.name}`)
          continue
        }
      }
      
      // Используем ИИ для выбора лучших поставщиков
      console.log(`🤖 Анализируем ${candidates.length} поставщиков через ИИ...`)
      const selectedSuppliers = await selectBestSuppliers(
        {
          name: position.name,
          description: position.description,
          quantity: position.quantity,
          unit: position.unit
        },
        candidates,
        maxSuppliers
      )
      
      console.log(`✅ ИИ выбрал ${selectedSuppliers.length} лучших поставщиков`)
      
      // Отправляем запросы выбранным поставщикам
      const suppliersToContact = selectedSuppliers.map(analysis => 
        requestData.suppliers.find(rs => rs.supplier.id === analysis.supplierId)
      ).filter(Boolean)
      
      for (const requestSupplier of suppliersToContact) {
        const supplier = requestSupplier.supplier
        
        // Проверяем, есть ли у поставщика WhatsApp
        if (!supplier.whatsapp) {
          console.log(`⚠️ У поставщика ${supplier.name} нет WhatsApp`)
          continue
        }

        try {
          // Находим или создаем чат с поставщиком
          let chat = await prisma.chat.findUnique({
            where: { phoneNumber: supplier.whatsapp }
          })

          if (!chat) {
            // Создаем новый чат
            chat = await prisma.chat.create({
              data: {
                phoneNumber: supplier.whatsapp,
                contactName: supplier.name,
                requestId: requestData.id,
                assignedTo: currentUser.id,
                status: 'ACTIVE'
              }
            })
            console.log(`📱 Создан чат с ${supplier.name}`)
          }

          // Создаем связь позиции с чатом
          const positionChat = await prisma.positionChat.upsert({
            where: {
              positionId_chatId: {
                positionId: position.id,
                chatId: chat.id
              }
            },
            update: {
              status: 'REQUESTED',
              requestSentAt: new Date()
            },
            create: {
              positionId: position.id,
              chatId: chat.id,
              status: 'REQUESTED',
              requestSentAt: new Date()
            }
          })

          // Генерируем персонализированное сообщение через GPT Assistant
          console.log(`🤖 Генерируем сообщение для ${supplier.name}...`)
          const message = await generateQuoteRequestMessage(requestData, position, supplier)
          
          // Отправляем сообщение через WhatsApp
          const sent = await whapiService.sendMessage(supplier.whatsapp, message)
          
          if (sent) {
            // Сохраняем сообщение в чат
            const chatMessage = await prisma.chatMessage.create({
              data: {
                chatId: chat.id,
                direction: 'OUTGOING',
                sender: currentUser.name,
                content: message,
                messageType: 'TEXT',
                status: 'SENT',
                timestamp: new Date(),
                metadata: {
                  sentBy: currentUser.id,
                  sentByName: currentUser.name,
                  positionId: position.id,
                  requestType: 'quote_request'
                }
              }
            })

            // Обновляем информацию о последнем сообщении в чате
            await prisma.chat.update({
              where: { id: chat.id },
              data: {
                lastMessage: message.length > 100 ? message.substring(0, 100) + '...' : message,
                lastMessageAt: new Date(),
                updatedAt: new Date()
              }
            })

            // Обновляем статус позиции
            await prisma.positionChat.update({
              where: { id: positionChat.id },
              data: { status: 'SENT' }
            })

            totalSent++
            console.log(`✅ Запрос КП отправлен ${supplier.name} для позиции ${position.name}`)
            
            results.push({
              positionId: position.id,
              positionName: position.name,
              supplierId: supplier.id,
              supplierName: supplier.name,
              phone: supplier.whatsapp,
              status: 'sent',
              chatId: chat.id
            })
          } else {
            console.log(`❌ Не удалось отправить сообщение ${supplier.name}`)
            results.push({
              positionId: position.id,
              positionName: position.name,
              supplierId: supplier.id,
              supplierName: supplier.name,
              phone: supplier.whatsapp,
              status: 'failed',
              error: 'Ошибка отправки WhatsApp'
            })
          }

          // Небольшая задержка между сообщениями
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error: any) {
          console.error(`❌ Ошибка отправки ${supplier.name}:`, error)
          results.push({
            positionId: position.id,
            positionName: position.name,
            supplierId: supplier.id,
            supplierName: supplier.name,
            phone: supplier.whatsapp,
            status: 'error',
            error: error.message
          })
        }
      }

      // Обновляем статус позиции
      await prisma.position.update({
        where: { id: position.id },
        data: {
          searchStatus: 'QUOTES_REQUESTED',
          quotesRequested: suppliersToContact.length
        }
      })
    }

    // Обновляем статус заявки
    await prisma.request.update({
      where: { id: params.id },
      data: {
        status: 'PENDING_QUOTES'
      }
    })

    return NextResponse.json({
      success: true,
      message: `Отправлено ${totalSent} запросов КП`,
      data: {
        totalSent,
        totalPositions: requestData.positions.length,
        results
      }
    })

  } catch (error: any) {
    console.error('❌ Error sending quote requests:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка при отправке запросов КП' },
      { status: 500 }
    )
  }
}

/**
 * Генерирует персонализированное сообщение с запросом коммерческого предложения через GPT Assistant
 */
async function generateQuoteRequestMessage(
  request: any,
  position: any,
  supplier: any
): Promise<string> {
  try {
    // Пытаемся сгенерировать сообщение через OpenAI Assistant
    const aiMessage = await openaiService.generateQuoteRequestMessage(
      supplier.name,
      position.name,
      position.description,
      position.quantity,
      position.unit,
      request.requestNumber
    )
    
    console.log(`✅ Сообщение сгенерировано ИИ для ${supplier.name}`)
    return aiMessage
    
  } catch (error) {
    console.error(`⚠️ Ошибка генерации ИИ для ${supplier.name}, используем базовый шаблон:`, error)
    
    // Fallback к базовому шаблону
    return getFallbackMessage(supplier.name, position.name, position.quantity, position.unit)
  }
}

/**
 * Базовый шаблон сообщения (fallback)
 */
function getFallbackMessage(
  supplierName: string,
  positionName: string,
  quantity: number,
  unit: string
): string {
  return `Здравствуйте! Меня зовут Санжар!

Не могли бы вы предоставить коммерческое предложение на покупку ${positionName}?

Количество: ${quantity} ${unit}

Обязательно укажите сумму в КП! Спасибо!`
}
