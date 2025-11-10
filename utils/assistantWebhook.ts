// Новая функция для работы с Assistant в webhook
import { createAssistantManager } from './assistantManager'

/**
 * Генерирует ответ поставщику через OpenAI Assistant
 */
export async function generateAssistantResponse(
  supplierMessage: string,
  chat: any,
  requestId: string
): Promise<string | null> {
  try {
    // Создаем менеджер Assistant
    const assistantManager = await createAssistantManager()
    
    // Информация о позициях для контекста
    const positions = chat.positionChats
      .map((pc: any) => `- ${pc.position.name} (${pc.position.quantity} ${pc.position.unit})`)
      .join('\n')
    
    // Получаем или создаем thread для этого чата
    const threadId = await assistantManager.getOrCreateThread(
      chat.id,
      requestId,
      chat.contactName || chat.phoneNumber
    )
    
    // Формируем контекстное сообщение для Assistant
    const contextMessage = `
ЗАЯВКА: ${chat.request.requestNumber}
ПОЗИЦИИ:
${positions}

СООБЩЕНИЕ ПОСТАВЩИКА: "${supplierMessage}"

Ответь как Санжар - менеджер по закупкам. Главная цель: получить КП!`
    
    console.log(`🤖 [${requestId}] Отправляем сообщение в Assistant thread: ${threadId}`)
    
    // Отправляем сообщение и получаем ответ от Assistant
    const aiResponse = await assistantManager.sendMessage(
      threadId,
      contextMessage,
      chat.id
    )
    
    if (!aiResponse) {
      console.log(`⚠️ [${requestId}] Assistant вернул пустой ответ`)
      return null
    }
    
    console.log(`✅ [${requestId}] Assistant ответ получен: "${aiResponse}"`)
    return aiResponse
    
  } catch (error) {
    console.error(`❌ [${requestId}] Ошибка работы с Assistant:`, error)
    
    // Fallback - простые автоответы на основе ключевых слов
    const lowerMessage = supplierMessage.toLowerCase()
    
    // Получаем первую позицию для персонализации ответа
    const firstPosition = chat.positionChats?.[0]?.position?.name || 'указанные позиции'
    
    if (lowerMessage.includes('привет') || lowerMessage.includes('здравствуй') || lowerMessage.includes('добр')) {
      return `Привет! Нужно КП на ${firstPosition}. Можете выслать? 📋`
    }
    
    if (lowerMessage.includes('цена') || lowerMessage.includes('стоимость') || lowerMessage.includes('сколько')) {
      return "Отлично! Пришлите коммерческое предложение с ценами - рассмотрим. 💰"
    }
    
    if (lowerMessage.includes('есть') || lowerMessage.includes('можем') || lowerMessage.includes('поставляем')) {
      return "Отлично! Пришлите коммерческое предложение - рассматриваем. ✅"
    }
    
    if (lowerMessage.includes('срок') || lowerMessage.includes('доставка') || lowerMessage.includes('когда')) {
      return "Понятно. Пришлите КП с указанием сроков - рассмотрим. ⏰"
    }
    
    if (lowerMessage.includes('вопрос') || lowerMessage.includes('уточнить')) {
      return "Конечно, отвечу. А КП когда сможете выслать? 📧"
    }
    
    // Общий ответ, направленный на получение КП
    return `Спасибо! Нужно КП на ${firstPosition}. Когда сможете выслать? 🚀`
  }
}
