// Whapi.Cloud Service - Сервис для работы с WhatsApp через Whapi.Cloud API
import axios, { AxiosInstance } from 'axios'

// Типы для статуса подключения
export type WhapiStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'qr_ready' 
  | 'authenticated' 
  | 'ready'
  | 'error'

interface WhapiState {
  status: WhapiStatus
  qrCode: string | null
  error: string | null
  phoneNumber: string | null
  lastActivity: Date | null
  instanceId: string | null
}

interface WhapiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

interface WhapiInstanceInfo {
  id: string
  name: string
  status: string
  phone_number?: string
  avatar?: string
  qr_code?: string
}

interface WhapiMessage {
  to: string
  body: string
  type?: 'text' | 'image' | 'document' | 'audio' | 'video'
  media?: {
    url?: string
    caption?: string
    filename?: string
  }
}

class WhapiService {
  private client: AxiosInstance
  private state: WhapiState = {
    status: 'disconnected',
    qrCode: null,
    error: null,
    phoneNumber: null,
    lastActivity: null,
    instanceId: null
  }
  private token: string | null = null
  private baseUrl: string
  private pollInterval: NodeJS.Timeout | null = null

  constructor() {
    this.token = process.env.WHAPI_TOKEN || null
    this.baseUrl = process.env.WHAPI_BASE_URL || 'https://gate.whapi.cloud'
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    // Инициализируем токен из базы данных
    this.initializeToken()

    // Добавляем интерцептор для логирования
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🌐 Whapi Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error('❌ Whapi Request Error:', error)
        return Promise.reject(error)
      }
    )

    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Whapi Response: ${response.status} ${response.config.url}`)
        return response
      },
      (error) => {
        console.error('❌ Whapi Response Error:', error.response?.status, error.response?.data)
        return Promise.reject(error)
      }
    )
  }

  /**
   * Инициализирует токен из базы данных
   */
  private async initializeToken(): Promise<void> {
    try {
      // Если токен уже есть из переменных окружения, используем его
      if (this.token && this.token !== 'your-whapi-token-here') {
        this.updateAuthHeader()
        return
      }

      // Пытаемся загрузить токен из базы данных
      const prisma = (await import('@/lib/prisma')).default
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'whapi_token' }
      })

      if (setting && setting.value) {
        this.token = setting.value
        this.updateAuthHeader()
        // console.log('✅ Whapi token loaded from database')
      }
    } catch (error) {
      console.error('❌ Error loading Whapi token from database:', error)
    }
  }

  /**
   * Обновляет заголовок авторизации
   */
  private updateAuthHeader(): void {
    if (this.token) {
      this.client.defaults.headers['Authorization'] = `Bearer ${this.token}`
    } else {
      delete this.client.defaults.headers['Authorization']
    }
  }

  /**
   * Устанавливает новый токен
   */
  async setToken(token: string): Promise<void> {
    this.token = token
    this.updateAuthHeader()
  }

  /**
   * Проверяет конфигурацию API
   */
  private async validateConfig(): Promise<void> {
    // Если токена нет, пытаемся загрузить из базы данных
    if (!this.token || this.token === 'your-whapi-token-here') {
      await this.initializeToken()
    }

    if (!this.token || this.token === 'your-whapi-token-here') {
      throw new Error('Whapi.Cloud токен не настроен. Настройте токен в разделе "Настройки" → "Интеграции"')
    }
  }

  /**
   * Получить информацию о пользователе (профиле)
   */
  async getInstanceInfo(): Promise<WhapiInstanceInfo | null> {
    try {
      await this.validateConfig()
      
      const response = await this.client.get('/users/profile')
      
      if (response.data) {
        // Преобразуем ответ в нужный формат
        return {
          id: response.data.id || 'whapi-channel',
          name: response.data.name || response.data.pushname || 'WhatsApp User',
          status: 'ready', // Если получили профиль, значит подключен
          phone_number: response.data.id ? response.data.id.split('@')[0] : undefined
        }
      }
      
      return null
    } catch (error: any) {
      console.error('❌ Error getting user profile:', error)
      // Если ошибка 401/403, значит не авторизован
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          id: 'whapi-channel',
          name: 'Not Connected',
          status: 'disconnected'
        }
      }
      throw new Error(error.response?.data?.error || 'Ошибка получения информации о пользователе')
    }
  }

  /**
   * Инициализирует WhatsApp инстанс
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Whapi.Cloud instance...')
      await this.validateConfig()
      
      this.state.status = 'connecting'
      this.state.error = null

      // Получаем информацию об инстансе
      const instanceInfo = await this.getInstanceInfo()
      
      if (!instanceInfo) {
        throw new Error('Не удалось получить информацию об инстансе')
      }

      this.state.instanceId = instanceInfo.id
      console.log(`📱 Instance ID: ${instanceInfo.id}`)
      console.log(`📊 Instance Status: ${instanceInfo.status}`)

      // Обновляем статус на основе статуса инстанса
      await this.updateStatusFromInstance(instanceInfo)

      // Запускаем периодическое обновление статуса
      this.startStatusPolling()

    } catch (error: any) {
      console.error('❌ Error initializing Whapi instance:', error)
      this.state.status = 'error'
      this.state.error = error.message || 'Ошибка инициализации Whapi.Cloud'
      throw error
    }
  }

  /**
   * Обновляет локальный статус на основе статуса инстанса
   */
  private async updateStatusFromInstance(instanceInfo: WhapiInstanceInfo): Promise<void> {
    switch (instanceInfo.status) {
      case 'ready':
        this.state.status = 'ready'
        this.state.phoneNumber = instanceInfo.phone_number || null
        this.state.qrCode = null
        this.state.lastActivity = new Date()
        console.log(`✅ WhatsApp ready! Phone: ${this.state.phoneNumber}`)
        break
        
      case 'qr':
        this.state.status = 'qr_ready'
        if (instanceInfo.qr_code) {
          this.state.qrCode = instanceInfo.qr_code
          console.log('📱 QR Code received')
        }
        break
        
      case 'loading':
        this.state.status = 'authenticated'
        this.state.qrCode = null
        console.log('🔄 WhatsApp loading...')
        break
        
      case 'disconnected':
        this.state.status = 'disconnected'
        this.state.qrCode = null
        this.state.phoneNumber = null
        console.log('🔌 WhatsApp disconnected')
        break
        
      default:
        console.log(`📊 Unknown status: ${instanceInfo.status}`)
        break
    }
  }

  /**
   * Запускает периодическое обновление статуса
   */
  private startStatusPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
    }

    this.pollInterval = setInterval(async () => {
      try {
        const instanceInfo = await this.getInstanceInfo()
        if (instanceInfo) {
          await this.updateStatusFromInstance(instanceInfo)
        }
      } catch (error) {
        console.error('❌ Error polling status:', error)
      }
    }, 3000) // Обновляем каждые 3 секунды
  }

  /**
   * Останавливает периодическое обновление статуса
   */
  private stopStatusPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  /**
   * Получить QR код для подключения
   */
  async getQRCode(): Promise<string | null> {
    try {
      await this.validateConfig()
      
      const response = await this.client.get('/users/login/image')
      
      if (response.data) {
        // Whapi.Cloud возвращает base64 изображение
        const qrImage = `data:image/png;base64,${response.data}`
        this.state.qrCode = qrImage
        this.state.status = 'qr_ready'
        return this.state.qrCode
      }
      
      return null
    } catch (error: any) {
      console.error('❌ Error getting QR code:', error)
      throw new Error(error.response?.data?.error || 'Ошибка получения QR кода')
    }
  }

  /**
   * Получить текущий статус
   */
  getStatus(): WhapiState {
    return { ...this.state }
  }

  /**
   * Проверить, готов ли клиент
   */
  isReady(): boolean {
    return this.state.status === 'ready'
  }

  /**
   * Отправить текстовое сообщение
   */
  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      await this.validateConfig()
      
      // Форматируем номер телефона (убираем все кроме цифр)
      const formattedNumber = phoneNumber.replace(/\D/g, '')
      
      const messageData = {
        to: formattedNumber,
        body: message
      }

      console.log(`📤 Sending message to ${formattedNumber}`)
      console.log(`📝 Message data:`, messageData)
      
      const response = await this.client.post('/messages/text', messageData)
      
      console.log(`📊 Response:`, response.data)
      
      if (response.data) {
        this.state.lastActivity = new Date()
        this.state.status = 'ready' // Если сообщение отправлено, значит подключен
        console.log(`✅ Message sent to ${phoneNumber}`)
        return true
      } else {
        throw new Error('Неизвестная ошибка при отправке')
      }
      
    } catch (error: any) {
      console.error('❌ Error sending message:', error)
      console.error('❌ Error response:', error.response?.data)
      
      // Если ошибка авторизации, обновляем статус
      if (error.response?.status === 401 || error.response?.status === 403) {
        this.state.status = 'disconnected'
      }
      
      throw new Error(error.response?.data?.error || error.response?.data?.message || `Ошибка отправки сообщения: ${error.message}`)
    }
  }

  /**
   * Отправить медиа файл
   */
  async sendMedia(phoneNumber: string, mediaUrl: string, caption?: string, type: 'image' | 'document' | 'audio' | 'video' = 'image'): Promise<boolean> {
    try {
      await this.validateConfig()
      
      if (!this.isReady()) {
        throw new Error('WhatsApp инстанс не готов')
      }

      const formattedNumber = phoneNumber.replace(/\D/g, '') + '@s.whatsapp.net'
      
      const messageData: WhapiMessage = {
        to: formattedNumber,
        body: caption || '',
        type: type,
        media: {
          url: mediaUrl,
          caption: caption
        }
      }

      console.log(`📤 Sending ${type} to ${formattedNumber}`)
      
      const response = await this.client.post(`/messages/${type}`, messageData)
      
      if (response.data && response.data.success) {
        this.state.lastActivity = new Date()
        console.log(`✅ ${type} sent to ${phoneNumber}`)
        return true
      } else {
        throw new Error(response.data?.error || 'Неизвестная ошибка при отправке медиа')
      }
      
    } catch (error: any) {
      console.error('❌ Error sending media:', error)
      throw new Error(error.response?.data?.error || `Ошибка отправки медиа: ${error.message}`)
    }
  }

  /**
   * Проверить, зарегистрирован ли номер в WhatsApp
   */
  async checkNumber(phoneNumber: string): Promise<boolean> {
    try {
      await this.validateConfig()
      
      const formattedNumber = phoneNumber.replace(/\D/g, '')
      
      const response = await this.client.get(`/contacts/check/${formattedNumber}`)
      
      if (response.data && response.data.success) {
        return response.data.data.exists || false
      }
      
      return false
    } catch (error: any) {
      console.error('❌ Error checking number:', error)
      return false
    }
  }

  /**
   * Отключить инстанс
   */
  async disconnect(): Promise<void> {
    try {
      console.log('🔌 Disconnecting Whapi instance...')
      
      this.stopStatusPolling()
      
      if (this.state.instanceId) {
        await this.client.post('/instances/logout')
      }
      
      this.state = {
        status: 'disconnected',
        qrCode: null,
        error: null,
        phoneNumber: null,
        lastActivity: null,
        instanceId: null
      }
      
      console.log('✅ Whapi instance disconnected')
    } catch (error: any) {
      console.error('❌ Error disconnecting:', error)
      // Все равно сбрасываем состояние
      this.state.status = 'disconnected'
      this.stopStatusPolling()
    }
  }

  /**
   * Очистить сессию (перезапуск инстанса)
   */
  async clearSession(): Promise<void> {
    try {
      console.log('🗑️ Clearing Whapi session...')
      
      this.stopStatusPolling()
      
      if (this.state.instanceId) {
        await this.client.post('/instances/restart')
      }
      
      this.state = {
        status: 'disconnected',
        qrCode: null,
        error: null,
        phoneNumber: null,
        lastActivity: null,
        instanceId: null
      }
      
      console.log('✅ Whapi session cleared')
    } catch (error: any) {
      console.error('❌ Error clearing session:', error)
      throw new Error(error.response?.data?.error || 'Ошибка очистки сессии')
    }
  }

  /**
   * Получить информацию о профиле
   */
  async getProfile(): Promise<any> {
    try {
      await this.validateConfig()
      
      const response = await this.client.get('/users/profile')
      
      if (response.data) {
        return response.data
      }
      
      return null
    } catch (error: any) {
      console.error('❌ Error getting profile:', error)
      throw new Error(error.response?.data?.error || 'Ошибка получения профиля')
    }
  }

  /**
   * Получить настройки канала
   */
  async getSettings(): Promise<any> {
    try {
      await this.validateConfig()
      
      const response = await this.client.get('/settings')
      
      if (response.data) {
        return response.data
      }
      
      return null
    } catch (error: any) {
      console.error('❌ Error getting settings:', error)
      throw new Error(error.response?.data?.error || 'Ошибка получения настроек')
    }
  }

  /**
   * Обновить настройки канала (включая webhook)
   */
  async updateSettings(settings: any): Promise<boolean> {
    try {
      await this.validateConfig()
      
      const response = await this.client.patch('/settings', settings)
      
      if (response.data) {
        console.log('✅ Настройки обновлены')
        return true
      }
      
      return false
    } catch (error: any) {
      console.error('❌ Error updating settings:', error)
      throw new Error(error.response?.data?.error || 'Ошибка обновления настроек')
    }
  }

  /**
   * Настроить webhook для получения входящих сообщений
   */
  async setupWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const settings = {
        webhook: {
          url: webhookUrl,
          events: ['message', 'message.ack', 'message.revoked']
        }
      }
      
      return await this.updateSettings(settings)
    } catch (error: any) {
      console.error('❌ Error setting up webhook:', error)
      throw new Error(error.response?.data?.error || 'Ошибка настройки webhook')
    }
  }

  /**
   * Тестировать webhook
   */
  async testWebhook(): Promise<boolean> {
    try {
      await this.validateConfig()
      
      const response = await this.client.post('/settings/webhook_test')
      
      if (response.data) {
        console.log('✅ Webhook протестирован')
        return true
      }
      
      return false
    } catch (error: any) {
      console.error('❌ Error testing webhook:', error)
      throw new Error(error.response?.data?.error || 'Ошибка тестирования webhook')
    }
  }
}

// Singleton instance
const whapiService = new WhapiService()

export default whapiService
