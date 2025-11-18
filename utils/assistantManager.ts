// Утилита для управления OpenAI Assistant и threads
import prisma from '@/lib/prisma'

interface AssistantConfig {
  assistantId: string
  apiKey: string
}

export class AssistantManager {
  private config: AssistantConfig

  constructor(config: AssistantConfig) {
    this.config = config
  }

  /**
   * Получить или создать thread для чата
   */
  async getOrCreateThread(chatId: string, requestId?: string, supplierName?: string): Promise<string> {
    try {
      // Проверяем, есть ли уже thread для этого чата
      let assistantThread = await prisma.assistantThread.findUnique({
        where: { chatId }
      })

      if (assistantThread) {
        console.log(`🧵 Используем существующий thread: ${assistantThread.threadId}`)
        return assistantThread.threadId
      }

      // Создаем новый thread через OpenAI API
      console.log(`🧵 Создаем новый thread для чата: ${chatId}`)
      
      const response = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          metadata: {
            chatId,
            requestId: requestId || '',
            supplierName: supplierName || '',
            createdAt: new Date().toISOString()
          }
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Ошибка создания thread: ${response.status} - ${error}`)
      }

      const thread = await response.json()
      console.log(`✅ Thread создан: ${thread.id}`)

      // Сохраняем в базу данных
      assistantThread = await prisma.assistantThread.create({
        data: {
          chatId,
          threadId: thread.id,
          assistantId: this.config.assistantId,
          supplierName,
          requestId,
          messageCount: 0
        }
      })

      console.log(`💾 Thread сохранен в БД: ${assistantThread.id}`)
      return thread.id

    } catch (error) {
      console.error('❌ Ошибка получения/создания thread:', error)
      throw error
    }
  }

  /**
   * Отправить сообщение в thread и получить ответ от Assistant
   */
  async sendMessage(
    threadId: string, 
    message: string, 
    chatId: string
  ): Promise<string> {
    try {
      console.log(`💬 Отправляем сообщение в thread ${threadId}: "${message}"`)

      // 1. Добавляем сообщение в thread
      const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: message
        })
      })

      if (!messageResponse.ok) {
        const error = await messageResponse.text()
        throw new Error(`Ошибка добавления сообщения: ${messageResponse.status} - ${error}`)
      }

      // 2. Запускаем Assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          assistant_id: this.config.assistantId
        })
      })

      if (!runResponse.ok) {
        const error = await runResponse.text()
        throw new Error(`Ошибка запуска Assistant: ${runResponse.status} - ${error}`)
      }

      const run = await runResponse.json()
      console.log(`🏃 Запущен run: ${run.id}`)

      // 3. Ждем завершения
      let runStatus = run
      let attempts = 0
      const maxAttempts = 30 // Максимум 30 секунд ожидания
      
      while (runStatus.status === 'running' || runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        if (attempts >= maxAttempts) {
          throw new Error(`Timeout: Run не завершился за ${maxAttempts} секунд`)
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        })

        if (!statusResponse.ok) {
          throw new Error(`Ошибка проверки статуса: ${statusResponse.status}`)
        }

        runStatus = await statusResponse.json()
        console.log(`⏳ Статус run: ${runStatus.status} (попытка ${attempts}/${maxAttempts})`)
      }

      if (runStatus.status !== 'completed') {
        console.error('❌ Детали ошибки run:', runStatus)
        throw new Error(`Run завершился с ошибкой: ${runStatus.status}`)
      }

      // 4. Получаем ответ
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      })

      if (!messagesResponse.ok) {
        throw new Error(`Ошибка получения сообщений: ${messagesResponse.status}`)
      }

      const messages = await messagesResponse.json()
      const assistantMessage = messages.data.find((msg: any) => 
        msg.role === 'assistant' && msg.run_id === run.id
      )

      if (!assistantMessage || !assistantMessage.content[0]) {
        throw new Error('Ответ Assistant не найден')
      }

      const responseText = assistantMessage.content[0].text.value
      console.log(`✅ Получен ответ от Санжара: "${responseText}"`)

      // 5. Обновляем статистику thread
      await prisma.assistantThread.update({
        where: { chatId },
        data: {
          lastMessageAt: new Date(),
          messageCount: { increment: 2 } // +1 за входящее, +1 за исходящее
        }
      })

      return responseText

    } catch (error) {
      console.error('❌ Ошибка отправки сообщения:', error)
      throw error
    }
  }

  /**
   * Получить статистику по thread
   */
  async getThreadStats(chatId: string) {
    try {
      const thread = await prisma.assistantThread.findUnique({
        where: { chatId },
        include: {
          chat: {
            select: {
              phoneNumber: true,
              contactName: true
            }
          }
        }
      })

      if (!thread) {
        return null
      }

      return {
        threadId: thread.threadId,
        messageCount: thread.messageCount,
        lastMessageAt: thread.lastMessageAt,
        supplierName: thread.supplierName,
        phoneNumber: thread.chat.phoneNumber,
        contactName: thread.chat.contactName
      }
    } catch (error) {
      console.error('❌ Ошибка получения статистики thread:', error)
      return null
    }
  }
}

/**
 * Создать экземпляр AssistantManager
 */
export async function createAssistantManager(): Promise<AssistantManager> {
  try {
    // Получаем настройки из базы данных
    const [assistantSetting, apiKeySetting] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: 'openai_assistant_id' } }),
      prisma.systemSetting.findUnique({ where: { key: 'openai_api_key' } })
    ])

    const assistantId = assistantSetting?.value
    const apiKey = apiKeySetting?.value || process.env.OPENAI_API_KEY

    if (!assistantId) {
      throw new Error('Assistant ID не найден в настройках. Запустите create-assistant-simple.ts')
    }

    if (!apiKey) {
      throw new Error('OpenAI API key не найден')
    }

    return new AssistantManager({ assistantId, apiKey })
  } catch (error) {
    console.error('❌ Ошибка создания AssistantManager:', error)
    throw error
  }
}
