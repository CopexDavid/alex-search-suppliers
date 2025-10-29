// WhatsApp Web.js Service - Singleton для управления WhatsApp клиентом
import { Client, LocalAuth, ClientOptions } from 'whatsapp-web.js'
import * as QRCode from 'qrcode'

// Типы для статуса подключения
export type WhatsAppStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'qr_ready' 
  | 'authenticated' 
  | 'ready'
  | 'error'

interface WhatsAppState {
  status: WhatsAppStatus
  qrCode: string | null
  error: string | null
  phoneNumber: string | null
  lastActivity: Date | null
}

class WhatsAppService {
  private client: Client | null = null
  private state: WhatsAppState = {
    status: 'disconnected',
    qrCode: null,
    error: null,
    phoneNumber: null,
    lastActivity: null
  }
  private qrCodeData: string | null = null
  private initializePromise: Promise<void> | null = null

  /**
   * Находит путь к Chrome браузеру
   */
  private findChromePath(): string | undefined {
    const fs = require('fs')
    const path = require('path')
    
    // Если указан в переменных окружения
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      return process.env.PUPPETEER_EXECUTABLE_PATH
    }
    
    // Пути для macOS
    const macPaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      // Путь к Chrome установленному через Puppeteer
      path.join(require('os').homedir(), '.cache/puppeteer/chrome/mac_arm-*/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
    ]
    
    for (const chromePath of macPaths) {
      if (chromePath.includes('*')) {
        // Для путей с wildcards используем glob поиск
        try {
          const glob = require('glob')
          const matches = glob.sync(chromePath)
          if (matches.length > 0 && fs.existsSync(matches[0])) {
            console.log(`🔍 Found Chrome at: ${matches[0]}`)
            return matches[0]
          }
        } catch (error) {
          // Если glob не установлен, пропускаем
        }
      } else if (fs.existsSync(chromePath)) {
        console.log(`🔍 Found Chrome at: ${chromePath}`)
        return chromePath
      }
    }
    
    console.log('🔍 Chrome not found, using Puppeteer default')
    return undefined
  }

  /**
   * Проверяет существование сохраненной сессии
   */
  private hasExistingSession(): boolean {
    try {
      const fs = require('fs')
      const path = require('path')
      const sessionPath = path.join(process.cwd(), 'wwebjs_auth', 'session-whatsapp-client-session')
      return fs.existsSync(sessionPath)
    } catch (error) {
      console.log('📂 No existing session found')
      return false
    }
  }

  /**
   * Инициализирует WhatsApp клиент
   */
  async initialize(): Promise<void> {
    // Если уже инициализируется - ждем завершения
    if (this.initializePromise) {
      return this.initializePromise
    }

    // Если уже готов - возвращаем
    if (this.client && this.state.status === 'ready') {
      console.log('✅ WhatsApp client already ready')
      return Promise.resolve()
    }

    // Проверяем наличие сохраненной сессии
    const hasSession = this.hasExistingSession()
    console.log(hasSession ? '📱 Found existing session, attempting to restore...' : '🆕 No existing session, will need QR code')

    this.initializePromise = this._initializeClient()
    return this.initializePromise
  }

  private async _initializeClient(): Promise<void> {
    try {
      console.log('🔄 Initializing WhatsApp client...')
      this.state.status = 'connecting'
      this.state.error = null

      // Настройки клиента
      const clientOptions: ClientOptions = {
        authStrategy: new LocalAuth({
          clientId: 'whatsapp-client-session', // Уникальный ID клиента
          dataPath: './wwebjs_auth' // Папка для хранения сессии (без точки в начале)
        }),
        puppeteer: {
          headless: true,
          // Используем найденный Chrome браузер
          executablePath: this.findChromePath(),
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-blink-features=AutomationControlled',
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-sync',
            '--no-default-browser-check',
            '--disable-plugins',
            '--disable-translate',
            '--disable-notifications',
            '--disable-ipc-flooding-protection',
            // Убираем --single-process и --no-zygote так как они могут вызывать проблемы
            `--user-data-dir=${require('path').join(require('os').tmpdir(), 'whatsapp-chrome-' + Date.now())}`
          ],
          timeout: 60000 // Увеличиваем таймаут до 60 секунд
        }
        // Убираем webVersionCache так как он вызывает проблемы с fetch в Node.js
        // whatsapp-web.js будет использовать встроенную версию
      }

      this.client = new Client(clientOptions)

      // Событие: Загрузка сессии
      this.client.on('loading_screen', (percent, message) => {
        console.log(`🔄 Loading WhatsApp: ${percent}% - ${message}`)
      })

      // Событие: QR код получен
      this.client.on('qr', async (qr: string) => {
        console.log('📱 QR Code received')
        this.qrCodeData = qr
        
        // Генерируем QR код как Data URL
        try {
          this.state.qrCode = await QRCode.toDataURL(qr, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          })
          this.state.status = 'qr_ready'
          console.log('✅ QR Code generated as Data URL and ready')
          console.log('📊 Current state after QR generation:', {
            status: this.state.status,
            hasQrCode: !!this.state.qrCode,
            qrCodeLength: this.state.qrCode?.length || 0
          })
        } catch (err) {
          console.error('❌ Error generating QR code:', err)
          this.state.status = 'error'
          this.state.error = 'Failed to generate QR code'
        }
      })

      // Событие: Аутентификация успешна
      this.client.on('authenticated', (session) => {
        console.log('✅ WhatsApp authenticated successfully')
        console.log('📱 Session data received, saving...')
        this.state.status = 'authenticated'
        this.state.qrCode = null
        this.qrCodeData = null
      })

      // Событие: Клиент готов
      this.client.on('ready', () => {
        console.log('✅ WhatsApp client is ready!')
        this.state.status = 'ready'
        this.state.lastActivity = new Date()
        
        // Получаем информацию о телефоне
        if (this.client) {
          this.client.info.then(info => {
            this.state.phoneNumber = info.wid.user
            console.log(`📞 Connected as: ${this.state.phoneNumber}`)
          }).catch(err => {
            console.error('Error getting phone info:', err)
          })
        }
      })

      // Событие: Ошибка аутентификации
      this.client.on('auth_failure', (msg) => {
        console.error('❌ Authentication failure:', msg)
        this.state.status = 'error'
        this.state.error = 'Authentication failed: ' + msg
      })

      // Событие: Отключение
      this.client.on('disconnected', (reason) => {
        console.log('🔌 WhatsApp disconnected:', reason)
        this.state.status = 'disconnected'
        this.state.qrCode = null
        this.qrCodeData = null
        this.state.phoneNumber = null
      })

      // Событие: Входящее сообщение (для будущего функционала)
      this.client.on('message', async (message) => {
        console.log(`📨 Message from ${message.from}: ${message.body}`)
        // Здесь можно добавить логику обработки входящих сообщений
      })

      // Инициализируем клиент
      await this.client.initialize()
      console.log('✅ WhatsApp client initialized')
      
    } catch (error: any) {
      console.error('❌ Error initializing WhatsApp client:', error)
      this.state.status = 'error'
      this.state.error = error.message || 'Failed to initialize WhatsApp client'
      
      // Очищаем клиент при ошибке
      if (this.client) {
        try {
          await this.client.destroy()
        } catch (destroyError) {
          console.error('Error destroying client after initialization failure:', destroyError)
        }
        this.client = null
      }
      
      throw error
    } finally {
      this.initializePromise = null
    }
  }

  /**
   * Получить текущий статус
   */
  getStatus(): WhatsAppState {
    const currentState = { ...this.state }
    // Логируем только при запросе QR кода для отладки
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 getStatus called:', {
        status: currentState.status,
        hasQrCode: !!currentState.qrCode,
        error: currentState.error
      })
    }
    return currentState
  }

  /**
   * Получить QR код в формате Data URL
   */
  getQRCode(): string | null {
    return this.state.qrCode
  }

  /**
   * Проверить, готов ли клиент
   */
  isReady(): boolean {
    return this.state.status === 'ready' && this.client !== null
  }

  /**
   * Отправить текстовое сообщение
   */
  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    if (!this.isReady() || !this.client) {
      throw new Error('WhatsApp client is not ready')
    }

    try {
      // Форматируем номер телефона (должен быть в формате 77001234567@c.us)
      const chatId = phoneNumber.replace(/\D/g, '') + '@c.us'
      
      console.log(`📤 Sending message to ${chatId}`)
      await this.client.sendMessage(chatId, message)
      
      this.state.lastActivity = new Date()
      console.log(`✅ Message sent to ${phoneNumber}`)
      return true
      
    } catch (error: any) {
      console.error('❌ Error sending message:', error)
      throw new Error(`Failed to send message: ${error.message}`)
    }
  }

  /**
   * Очистить сохраненную сессию
   */
  async clearSession(): Promise<void> {
    try {
      const fs = require('fs')
      const path = require('path')
      const sessionPath = path.join(process.cwd(), 'wwebjs_auth')
      
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true })
        console.log('🗑️ Session data cleared')
      }
    } catch (error) {
      console.error('❌ Error clearing session:', error)
    }
  }

  /**
   * Отключить клиент
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      console.log('🔌 Disconnecting WhatsApp client...')
      try {
        await this.client.destroy()
      } catch (error) {
        console.error('Error destroying client:', error)
      }
      this.client = null
      this.state = {
        status: 'disconnected',
        qrCode: null,
        error: null,
        phoneNumber: null,
        lastActivity: null
      }
      this.initializePromise = null
      console.log('✅ WhatsApp client disconnected')
    }
  }

  /**
   * Проверить, можно ли отправить сообщение на номер
   */
  async checkNumber(phoneNumber: string): Promise<boolean> {
    if (!this.isReady() || !this.client) {
      throw new Error('WhatsApp client is not ready')
    }

    try {
      const chatId = phoneNumber.replace(/\D/g, '') + '@c.us'
      const isRegistered = await this.client.isRegisteredUser(chatId)
      return isRegistered
    } catch (error) {
      console.error('Error checking number:', error)
      return false
    }
  }
}

// Singleton instance
const whatsappService = new WhatsAppService()

export default whatsappService

