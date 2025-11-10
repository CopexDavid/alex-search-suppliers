// Сервис для работы с OpenAI Assistant
import OpenAI from 'openai'
import prisma from '@/lib/prisma'

class OpenAIService {
  private client: OpenAI | null = null
  private assistantId: string | null = null

  constructor() {
    this.initializeClient()
  }

  /**
   * Инициализирует клиент OpenAI с настройками из базы данных
   */
  private async initializeClient(): Promise<void> {
    try {
      // Пытаемся загрузить настройки из переменных окружения
      let apiKey = process.env.OPENAI_API_KEY
      let assistantId = process.env.OPENAI_ASSISTANT_ID

      // Если настроек нет в переменных окружения, загружаем из базы данных
      if (!apiKey || apiKey === 'sk-your-openai-api-key-here' || 
          !assistantId || assistantId === 'asst_your-assistant-id-here') {
        
        const [apiKeySetting, assistantIdSetting] = await Promise.all([
          prisma.systemSetting.findUnique({
            where: { key: 'openai_api_key' }
          }),
          prisma.systemSetting.findUnique({
            where: { key: 'openai_assistant_id' }
          })
        ])

        if (apiKeySetting?.value) {
          apiKey = apiKeySetting.value
        }
        if (assistantIdSetting?.value) {
          assistantId = assistantIdSetting.value
        }
      }

      if (apiKey && apiKey !== 'sk-your-openai-api-key-here') {
        this.client = new OpenAI({
          apiKey: apiKey,
          defaultHeaders: {
            'OpenAI-Beta': 'assistants=v2'
          }
        })
        this.assistantId = assistantId || null
        console.log('✅ OpenAI client initialized')
      } else {
        console.log('⚠️ OpenAI API key not configured')
      }
    } catch (error) {
      console.error('❌ Error initializing OpenAI client:', error)
    }
  }

  /**
   * Проверяет, настроен ли OpenAI клиент
   */
  private async validateConfig(): Promise<void> {
    if (!this.client || !this.assistantId) {
      await this.initializeClient()
    }

    if (!this.client || !this.assistantId) {
      throw new Error('OpenAI не настроен. Проверьте API ключ и ID ассистента в настройках.')
    }
  }

  /**
   * Генерирует персонализированное сообщение для запроса КП
   */
  async generateQuoteRequestMessage(
    supplierName: string,
    positionName: string,
    positionDescription: string | null,
    quantity: number,
    unit: string,
    requestNumber: string
  ): Promise<string> {
    try {
      await this.validateConfig()

      const prompt = `Сгенерируй персонализированное сообщение для запроса коммерческого предложения.

Данные:
- Поставщик: ${supplierName}
- Позиция: ${positionName}
- Описание: ${positionDescription || 'Не указано'}
- Количество: ${quantity} ${unit}
- Номер заявки: ${requestNumber}

Требования к сообщению:
1. Максимально похоже на человека
2. Вежливое и профессиональное обращение
3. Представиться как Санжар
4. Обязательно попросить указать сумму в КП
5. Использовать естественный разговорный стиль
6. Длина сообщения: 3-5 предложений

Пример стиля: "Здравствуйте! Меня зовут Санжар! Не могли бы предоставить Коммерческое предложение на покупку..."

Сгенерируй только текст сообщения без дополнительных пояснений.`

      const thread = await this.client!.beta.threads.create()
      
      await this.client!.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: prompt
      })

      const run = await this.client!.beta.threads.runs.create(thread.id, {
        assistant_id: this.assistantId!
      })

      // Ждем завершения выполнения
      let runStatus = await this.client!.beta.threads.runs.retrieve(thread.id, run.id)
      
      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000))
        runStatus = await this.client!.beta.threads.runs.retrieve(thread.id, run.id)
      }

      if (runStatus.status === 'completed') {
        const messages = await this.client!.beta.threads.messages.list(thread.id)
        const lastMessage = messages.data[0]
        
        if (lastMessage.role === 'assistant' && lastMessage.content[0].type === 'text') {
          return lastMessage.content[0].text.value.trim()
        }
      }

      throw new Error(`Ошибка генерации сообщения: ${runStatus.status}`)

    } catch (error: any) {
      console.error('❌ Error generating message:', error)
      
      // Возвращаем базовый шаблон в случае ошибки
      return this.getFallbackMessage(supplierName, positionName, quantity, unit)
    }
  }

  /**
   * Базовый шаблон сообщения на случай ошибки ИИ
   */
  private getFallbackMessage(
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

  /**
   * Проверяет доступность OpenAI API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.validateConfig()
      
      // Простой тест - получение информации об ассистенте
      const assistant = await this.client!.beta.assistants.retrieve(this.assistantId!)
      
      return !!assistant.id
    } catch (error) {
      console.error('❌ OpenAI connection test failed:', error)
      return false
    }
  }

  /**
   * Получает информацию об ассистенте
   */
  async getAssistantInfo(): Promise<any> {
    try {
      await this.validateConfig()
      
      const assistant = await this.client!.beta.assistants.retrieve(this.assistantId!)
      
      return {
        id: assistant.id,
        name: assistant.name,
        description: assistant.description,
        model: assistant.model
      }
    } catch (error) {
      console.error('❌ Error getting assistant info:', error)
      throw error
    }
  }
}

// Singleton instance
const openaiService = new OpenAIService()

export default openaiService

// Экспорт простого OpenAI клиента для парсера
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-your-openai-api-key-here'
})
