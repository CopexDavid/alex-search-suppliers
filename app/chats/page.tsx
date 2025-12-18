"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  MessageSquare,
  Send,
  Paperclip,
  Download,
  User,
  Clock,
  CheckCircle,
  FileText,
  ImageIcon,
  File,
  Search,
  MoreVertical,
  XCircle,
  Loader2,
  RefreshCw,
  Link,
  LinkIcon,
  Plus,
  Merge,
  ArrowLeft,
} from "lucide-react"
import { MessageLogsDialog } from "@/components/message-logs-dialog"

interface Chat {
  id: string
  phoneNumber: string
  contactName?: string
  requestId?: string
  lastMessage?: string
  lastMessageAt?: string
  createdAt?: string
  status: 'ACTIVE' | 'WAITING' | 'COMPLETED' | 'ARCHIVED'
  unreadCount: number
  assignedTo?: string
  request?: {
    id: string
    requestNumber: string
    description?: string
    status: string
  }
  assignedUser?: {
    id: string
    name: string
    email: string
  }
  _count?: {
    messages: number
  }
}

interface ChatMessage {
  id: string
  chatId: string
  messageId?: string
  direction: 'INCOMING' | 'OUTGOING'
  sender?: string
  content: string
  messageType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'VIDEO'
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
  attachments?: any
  metadata?: {
    whapi_data?: {
      document?: {
        id: string
        mime_type: string
        file_size: number
        file_name: string
        filename: string
        caption?: string
        preview?: string
      }
    }
    [key: string]: any
  }
  timestamp: string
  createdAt: string
}

interface Request {
  id: string
  requestNumber: string
  description?: string
  status: string
  positions?: {
    id: string
    name: string
    description?: string
    quantity: number
    unit: string
  }[]
}

export default function ChatsPage() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  
  // Состояния для привязки к заявке
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkingChatId, setLinkingChatId] = useState<string | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [selectedRequestId, setSelectedRequestId] = useState("")
  const [linkingRequest, setLinkingRequest] = useState(false)
  const [currentChatPositions, setCurrentChatPositions] = useState<string[]>([]) // Текущие привязки к позициям
  const [unlinkingPosition, setUnlinkingPosition] = useState<string | null>(null)
  
  // Состояния для создания нового чата
  const [showCreateChatDialog, setShowCreateChatDialog] = useState(false)
  const [newChatPhone, setNewChatPhone] = useState("")
  const [newChatName, setNewChatName] = useState("")
  const [creatingChat, setCreatingChat] = useState(false)
  
  // Состояние для мобильного вида (нужно для переключения между списком и чатом)
  const [isMobileView, setIsMobileView] = useState(false)
  
  // Состояние для объединения дубликатов
  const [mergingChats, setMergingChats] = useState(false)
  
  // Определяем мобильный вид при загрузке и ресайзе
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Функция объединения дубликатов чатов
  const mergeDuplicateChats = async () => {
    if (!confirm('Объединить все дублирующиеся чаты (с одинаковыми номерами телефонов)?')) return
    
    try {
      setMergingChats(true)
      const response = await fetch('/api/chats/merge', {
        method: 'PUT',
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.data.duplicateGroupsProcessed > 0) {
          alert(`✅ Объединено ${data.data.totalChatsMerged} чатов!\nПеренесено сообщений: ${data.data.totalMessagesMoved}\nПеренесено привязок: ${data.data.totalPositionChatsMoved}`)
          loadChats()
        } else {
          alert('✅ Дубликатов не найдено!')
        }
      } else {
        const error = await response.json()
        alert(`❌ Ошибка: ${error.error}`)
      }
    } catch (error) {
      console.error('Error merging chats:', error)
      alert('❌ Ошибка при объединении чатов')
    } finally {
      setMergingChats(false)
    }
  }

  // Загрузка чатов
  const loadChats = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await fetch(`/api/chats?${params}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setChats(data.data.chats)
      } else {
        console.error('Error loading chats:', response.statusText)
      }
    } catch (error) {
      console.error('Error loading chats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Функция для форматирования номера телефона
  const formatPhoneNumber = (value: string, forInput = false) => {
    // Если это для отображения (не для ввода), просто добавляем + если нужно
    if (!forInput) {
      return value.startsWith('+') ? value : `+${value}`
    }
    
    // Для ввода - полное форматирование
    // Удаляем все символы кроме цифр
    const numbers = value.replace(/\D/g, '')
    
    // Если начинается с 8, заменяем на 7
    let formattedNumbers = numbers
    if (numbers.startsWith('8')) {
      formattedNumbers = '7' + numbers.slice(1)
    }
    
    // Форматируем в вид +7 (747) 123-33-23
    if (formattedNumbers.length >= 1 && formattedNumbers.startsWith('7')) {
      let formatted = '+7'
      if (formattedNumbers.length > 1) {
        formatted += ' (' + formattedNumbers.slice(1, 4)
        if (formattedNumbers.length > 4) {
          formatted += ') ' + formattedNumbers.slice(4, 7)
          if (formattedNumbers.length > 7) {
            formatted += '-' + formattedNumbers.slice(7, 9)
            if (formattedNumbers.length > 9) {
              formatted += '-' + formattedNumbers.slice(9, 11)
            }
          }
        }
      }
      return formatted
    }
    
    return value
  }

  // Создание нового чата
  const createNewChat = async () => {
    if (!newChatPhone.trim() || !newChatName.trim()) {
      alert('Пожалуйста, заполните все поля')
      return
    }

    // Извлекаем только цифры из номера телефона
    const phoneDigits = newChatPhone.replace(/\D/g, '')
    
    // Проверяем формат номера (должен начинаться с 7 и содержать 11 цифр)
    if (!phoneDigits.startsWith('7') || phoneDigits.length !== 11) {
      alert('Пожалуйста, введите корректный номер телефона в формате +7 (747) 123-33-23')
      return
    }

    try {
      setCreatingChat(true)
      
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          phoneNumber: '+' + phoneDigits,
          contactName: newChatName.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Чат создан:', data.data)
        
        // Очищаем форму
        setNewChatPhone('')
        setNewChatName('')
        setShowCreateChatDialog(false)
        
        // Обновляем список чатов
        await loadChats()
        
        // Выбираем созданный чат
        setSelectedChat(data.data.id)
        
        alert('Чат успешно создан!')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Ошибка при создании чата')
      }
    } catch (error) {
      console.error('Error creating chat:', error)
      alert('Ошибка при создании чата')
    } finally {
      setCreatingChat(false)
    }
  }

  // Загрузка сообщений чата
  const loadMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data.data.messages)
      } else {
        console.error('Error loading messages:', response.statusText)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  // Загрузка заявок для привязки
  const loadRequests = async () => {
    try {
      const response = await fetch('/api/requests', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('📋 Loaded requests:', data)
        setRequests(data.data || [])
      } else {
        console.error('❌ Failed to load requests:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading requests:', error)
    }
  }

  // Загрузка текущих привязок чата к позициям
  const loadChatPositions = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        const chat = data.data || data.chat
        if (chat?.positionChats) {
          const positionIds = chat.positionChats.map((pc: any) => pc.positionId)
          setCurrentChatPositions(positionIds)
          // Если чат привязан к заявке, устанавливаем selectedRequestId
          if (chat.requestId) {
            setSelectedRequestId(chat.requestId)
          }
        } else {
          setCurrentChatPositions([])
        }
      }
    } catch (error) {
      console.error('Error loading chat positions:', error)
      setCurrentChatPositions([])
    }
  }

  // Открыть диалог привязки к заявке
  const openLinkDialog = async (chatId: string) => {
    setLinkingChatId(chatId)
    setSelectedRequestId("")
    setCurrentChatPositions([])
    setShowLinkDialog(true)
    await loadRequests()
    await loadChatPositions(chatId)
  }

  // Привязать чат к заявке
  const linkChatToRequest = async () => {
    if (!linkingChatId || !selectedRequestId) return
    
    try {
      setLinkingRequest(true)
      
      // Получаем выбранные позиции
      const selectedPositions = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
        .map((checkbox: any) => checkbox.value)
      
      // Сначала привязываем чат к заявке
      const response = await fetch(`/api/chats/${linkingChatId}/link-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ requestId: selectedRequestId })
      })
      
      if (!response.ok) {
        const data = await response.json()
        alert(`❌ Ошибка привязки к заявке: ${data.error}`)
        setLinkingRequest(false)
        return
      }
      
      // Проверяем, что выбрана хотя бы одна позиция
      if (selectedPositions.length === 0) {
        alert('⚠️ Пожалуйста, выберите хотя бы одну позицию для привязки чата.')
        setLinkingRequest(false)
        return
      }
      
      // Фильтруем позиции - привязываем только те, которые еще не привязаны
      const positionsToLink = selectedPositions.filter(posId => !currentChatPositions.includes(posId))
      
      if (positionsToLink.length === 0) {
        alert('⚠️ Все выбранные позиции уже привязаны к этому чату.')
        setLinkingRequest(false)
        return
      }
      
      // Привязываем к каждой новой позиции
      for (const positionId of positionsToLink) {
        const positionResponse = await fetch(`/api/chats/${linkingChatId}/link-position`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ positionId })
        })
        
        if (!positionResponse.ok) {
          const data = await positionResponse.json()
          console.error(`Ошибка привязки к позиции ${positionId}:`, data.error)
          alert(`❌ Ошибка привязки к позиции: ${data.error}`)
          setLinkingRequest(false)
          return
        }
      }
      
      alert(`✅ Чат успешно привязан к ${positionsToLink.length} позициям!`)
      // Обновляем список текущих привязок
      await loadChatPositions(linkingChatId)
      loadChats() // Обновляем список чатов
    } catch (error) {
      console.error('Error linking chat:', error)
      alert('❌ Ошибка при привязке чата')
    } finally {
      setLinkingRequest(false)
    }
  }

  // Отвязать чат от позиции
  const unlinkChatFromPosition = async (chatId: string, positionId: string) => {
    if (!confirm('Отвязать чат от этой позиции?')) return
    
    try {
      setUnlinkingPosition(positionId)
      const response = await fetch(`/api/chats/${chatId}/link-position`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ positionId })
      })
      
      if (response.ok) {
        alert('✅ Чат отвязан от позиции!')
        // Обновляем список текущих привязок
        await loadChatPositions(chatId)
        loadChats() // Обновляем список чатов
      } else {
        const data = await response.json()
        alert(`❌ Ошибка: ${data.error}`)
      }
    } catch (error) {
      console.error('Error unlinking chat from position:', error)
      alert('❌ Ошибка при отвязке чата от позиции')
    } finally {
      setUnlinkingPosition(null)
    }
  }

  // Отвязать чат от заявки (полностью)
  const unlinkChatFromRequest = async (chatId: string) => {
    if (!confirm('Отвязать чат от заявки и всех позиций?')) return
    
    try {
      const response = await fetch(`/api/chats/${chatId}/link-request`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (response.ok) {
        alert('✅ Чат отвязан от заявки!')
        setCurrentChatPositions([])
        setSelectedRequestId("")
        loadChats() // Обновляем список чатов
      } else {
        const data = await response.json()
        alert(`❌ Ошибка: ${data.error}`)
      }
    } catch (error) {
      console.error('Error unlinking chat:', error)
      alert('❌ Ошибка при отвязке чата')
    }
  }

  // Отправка сообщения
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sendingMessage) return

    setSendingMessage(true)
    try {
      const response = await fetch(`/api/chats/${selectedChat}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          content: newMessage.trim(),
          messageType: 'TEXT'
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Добавляем новое сообщение в список
        setMessages(prev => [...prev, data.data])
        setNewMessage("")
        // Обновляем список чатов
        loadChats()
      } else {
        const errorData = await response.json()
        alert(`Ошибка отправки: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Ошибка при отправке сообщения')
    } finally {
      setSendingMessage(false)
    }
  }

  // Загрузка данных при монтировании
  useEffect(() => {
    loadChats()
  }, [])

  // Загрузка данных при изменении поискового запроса
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadChats()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Загрузка сообщений при выборе чата
  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat)
    }
  }, [selectedChat])

  // Автообновление чатов каждые 30 секунд (уменьшили частоту)
  useEffect(() => {
    const interval = setInterval(() => {
      loadChats()
      // Обновляем сообщения выбранного чата
      if (selectedChat) {
        loadMessages(selectedChat)
      }
    }, 30000) // 30 секунд

    return () => clearInterval(interval)
  }, [selectedChat])


  const getStatusBadge = (status: 'ACTIVE' | 'WAITING' | 'COMPLETED' | 'ARCHIVED') => {
    const variants = {
      ACTIVE: { variant: "default" as const, icon: MessageSquare, text: "Активный" },
      WAITING: { variant: "secondary" as const, icon: Clock, text: "Ожидание" },
      COMPLETED: { variant: "outline" as const, icon: CheckCircle, text: "Завершен" },
      ARCHIVED: { variant: "outline" as const, icon: CheckCircle, text: "Архив" },
    }

    const config = variants[status]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  // Форматирование времени для сообщений (часы:минуты)
  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Полное форматирование даты и времени
  const formatFullDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Форматирование времени для списка чатов (дата + время)
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    const timeStr = date.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    
    if (diffDays === 0) {
      // Сегодня - только время
      return timeStr
    } else if (diffDays === 1) {
      // Вчера - "Вчера, 14:30"
      return `Вчера, ${timeStr}`
    } else if (diffDays < 7) {
      // На этой неделе - "Пн, 14:30"
      const dayStr = date.toLocaleString('ru-RU', { weekday: 'short' })
      return `${dayStr}, ${timeStr}`
    } else {
      // Старше недели - "15.12, 14:30"
      const dateStr = date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit' })
      return `${dateStr}, ${timeStr}`
    }
  }

  // Получить дату для разделителя сообщений
  const getMessageDateLabel = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return 'Сегодня'
    } else if (diffDays === 1) {
      return 'Вчера'
    } else {
      return date.toLocaleString('ru-RU', { 
        day: 'numeric', 
        month: 'long',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  // Проверить, нужен ли разделитель даты между сообщениями
  const shouldShowDateSeparator = (currentMsg: ChatMessage, prevMsg: ChatMessage | null) => {
    if (!prevMsg) return true
    
    const currentDate = new Date(currentMsg.timestamp).toDateString()
    const prevDate = new Date(prevMsg.timestamp).toDateString()
    
    return currentDate !== prevDate
  }


  const getInitials = (name?: string, phone?: string) => {
    if (name && name !== phone) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return phone?.slice(-2) || '??'
  }

  const getFileIcon = (mimeType: string, fileName?: string) => {
    const lowerFileName = fileName?.toLowerCase() || ''
    
    if (mimeType.includes('pdf') || lowerFileName.endsWith('.pdf')) {
      return <FileText className="h-4 w-4 text-red-500" />
    }
    if (mimeType.includes('image') || lowerFileName.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />
    }
    if (mimeType.includes('word') || lowerFileName.match(/\.(doc|docx)$/)) {
      return <FileText className="h-4 w-4 text-blue-600" />
    }
    if (mimeType.includes('excel') || lowerFileName.match(/\.(xls|xlsx)$/)) {
      return <FileText className="h-4 w-4 text-green-600" />
    }
    return <File className="h-4 w-4 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDownloadDocument = async (documentId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/whatsapp/download-document/${documentId}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Ошибка скачивания файла')
      }
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Ошибка скачивания файла')
    }
  }

  const handlePreviewDocument = (documentData: any) => {
    if (documentData.preview) {
      // Открываем превью в новом окне
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Превью документа</title></head>
            <body style="margin:0;padding:20px;background:#f5f5f5;">
              <h3>${documentData.file_name || documentData.filename}</h3>
              <img src="${documentData.preview}" style="max-width:100%;height:auto;" />
            </body>
          </html>
        `)
      }
    }
  }

  // Компонент для отображения документа
  const DocumentMessage = ({ message }: { message: ChatMessage }) => {
    const documentData = message.metadata?.whapi_data?.document
    if (!documentData) return null

    const fileName = documentData.file_name || documentData.filename || 'Документ'
    const fileSize = documentData.file_size || 0
    const mimeType = documentData.mime_type || ''
    const hasPreview = !!documentData.preview

    return (
      <div className="border rounded-lg p-3 bg-background/50 max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
            📨
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              {getFileIcon(mimeType, fileName)}
              <span className="text-sm font-medium truncate">{fileName}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {formatFileSize(fileSize)} • {mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
            </p>
            <div className="flex space-x-2">
              {hasPreview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreviewDocument(documentData)}
                  className="h-7 px-2 text-xs"
                >
                  👁️ Просмотр
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadDocument(documentData.id, fileName)}
                className="h-7 px-2 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Скачать
              </Button>
            </div>
          </div>
        </div>
        {message.content && message.content !== fileName && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-sm text-muted-foreground">{message.content}</p>
          </div>
        )}
      </div>
    )
  }

  const filteredChats = chats.filter(
    (chat) =>
      (chat.contactName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (chat.phoneNumber.includes(searchTerm)) ||
      (chat.request?.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const currentChat = chats.find((c) => c.id === selectedChat)

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-background">
      {/* Список чатов - ЛЕВАЯ часть (фиксированная ширина) */}
      <div className={`
        ${selectedChat && isMobileView ? 'hidden' : 'flex'} 
        md:flex flex-col
        w-full md:w-80 lg:w-96
        border-r bg-card
        flex-shrink-0
      `}>
        {/* Шапка списка чатов */}
        <div className="flex-shrink-0 border-b p-3 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Чаты</h1>
              <Badge variant="secondary" className="text-xs">
                {filteredChats.length}
              </Badge>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCreateChatDialog(true)}
                className="h-8 w-8"
                title="Новый чат"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  loadChats()
                  if (selectedChat) loadMessages(selectedChat)
                }}
                disabled={loading}
                className="h-8 w-8"
                title="Обновить"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <MessageLogsDialog 
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Логи">
                    <FileText className="h-4 w-4" />
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={mergeDuplicateChats}
                disabled={mergingChats}
                className="h-8 w-8"
                title="Объединить дубликаты"
              >
                {mergingChats ? <Loader2 className="h-4 w-4 animate-spin" /> : <Merge className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени, телефону, заявке..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Список чатов */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Загрузка...</p>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground text-center">
                  {searchTerm ? 'Ничего не найдено' : 'Нет чатов'}
                </p>
                {searchTerm && (
                  <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')} className="mt-2">
                    Сбросить поиск
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat.id)}
                    className={`
                      relative p-3 rounded-lg cursor-pointer transition-colors
                      ${selectedChat === chat.id 
                        ? 'bg-primary/10 border-l-2 border-l-primary' 
                        : 'hover:bg-muted/50'
                      }
                    `}
                  >
                    <div className="flex gap-3">
                      {/* Аватар */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="text-sm font-medium bg-gradient-to-br from-primary/20 to-primary/5">
                            {getInitials(chat.contactName, chat.phoneNumber)}
                          </AvatarFallback>
                        </Avatar>
                        {chat.status === 'ACTIVE' && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                        )}
                      </div>
                      
                      {/* Контент */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        {/* Имя и непрочитанные */}
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span 
                            className="font-medium text-sm truncate"
                            title={chat.contactName || formatPhoneNumber(chat.phoneNumber)}
                          >
                            {chat.contactName || formatPhoneNumber(chat.phoneNumber)}
                          </span>
                          {chat.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs flex-shrink-0">
                              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Последнее сообщение */}
                        <p className="text-xs text-muted-foreground truncate mb-1">
                          {chat.lastMessage || 'Нет сообщений'}
                        </p>
                        
                        {/* Время последнего сообщения */}
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {chat.lastMessageAt 
                              ? formatTimestamp(chat.lastMessageAt)
                              : chat.createdAt 
                              ? formatTimestamp(chat.createdAt)
                              : 'Время не указано'}
                          </span>
                        </div>
                        
                        {/* Теги: заявка, статус */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {chat.request?.requestNumber && (
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                              {chat.request.requestNumber}
                            </Badge>
                          )}
                          <Badge 
                            variant={chat.status === 'ACTIVE' ? 'default' : 'secondary'} 
                            className="text-[10px] h-5 px-1.5"
                          >
                            {chat.status === 'ACTIVE' ? 'Активный' : 
                             chat.status === 'WAITING' ? 'Ожидание' :
                             chat.status === 'COMPLETED' ? 'Завершен' : 'Архив'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Нижняя панель */}
        <div className="flex-shrink-0 border-t px-3 py-2 bg-muted/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Онлайн</span>
            </div>
            <span>{chats.length} чатов</span>
          </div>
        </div>
      </div>

      {/* Область чата - ПРАВАЯ часть (растягивается) */}
      <div className={`
        ${!selectedChat && isMobileView ? 'hidden' : 'flex'}
        md:flex flex-1 flex-col min-w-0 bg-background
      `}>
        {selectedChat ? (
          <>
            {/* Шапка чата */}
            <div className="flex-shrink-0 border-b px-4 py-3 bg-card">
              <div className="flex items-center gap-3">
                {/* Кнопка назад для мобильных */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden h-8 w-8 flex-shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                
                {/* Аватар */}
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback>{getInitials(currentChat?.contactName, currentChat?.phoneNumber)}</AvatarFallback>
                </Avatar>
                
                {/* Информация о чате */}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold truncate" title={currentChat?.contactName || formatPhoneNumber(currentChat?.phoneNumber || '')}>
                    {currentChat?.contactName || formatPhoneNumber(currentChat?.phoneNumber || '')}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {currentChat?.request?.requestNumber && (
                      <Badge variant="outline" className="text-[10px] h-4">{currentChat.request.requestNumber}</Badge>
                    )}
                    {currentChat?.assignedUser && (
                      <span className="truncate">{currentChat.assignedUser.name}</span>
                    )}
                  </div>
                </div>
                
                {/* Кнопки управления - ВСЕГДА ВИДНЫ */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openLinkDialog(currentChat?.id || '')}
                    title={currentChat?.request ? "Управление привязками" : "Привязать к заявке"}
                  >
                    <LinkIcon className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">{currentChat?.request ? 'Привязки' : 'К заявке'}</span>
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Детали</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Информация о чате</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Контакт</Label>
                            <p className="font-medium">{currentChat?.contactName || 'Не указан'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Телефон</Label>
                            <p className="font-medium">{formatPhoneNumber(currentChat?.phoneNumber || '')}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Заявка</Label>
                            <p className="font-medium">{currentChat?.request?.requestNumber || 'Не привязана'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Менеджер</Label>
                            <p className="font-medium">{currentChat?.assignedUser?.name || 'Не назначен'}</p>
                          </div>
                        </div>
                        {currentChat?.request?.description && (
                          <div>
                            <Label className="text-muted-foreground">Описание заявки</Label>
                            <p className="mt-1">{currentChat.request.description}</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Сообщения */}
            <ScrollArea className="flex-1 bg-muted/20">
              <div className="p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Нет сообщений</p>
                    <p className="text-xs text-muted-foreground mt-1">Начните общение</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div key={message.id}>
                      {/* Разделитель дат */}
                      {shouldShowDateSeparator(message, messages[index - 1] || null) && (
                        <div className="flex justify-center my-4">
                          <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
                            {getMessageDateLabel(message.timestamp)}
                          </span>
                        </div>
                      )}
                      
                      {/* Сообщение */}
                      <div className={`flex ${message.direction === 'OUTGOING' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                          max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2 shadow-sm
                          ${message.direction === 'OUTGOING' 
                            ? 'bg-primary text-primary-foreground rounded-br-md' 
                            : 'bg-card border rounded-bl-md'
                          }
                        `}>
                          {message.direction === 'OUTGOING' && message.sender && (
                            <p className="text-xs font-medium opacity-70 mb-1">{message.sender}</p>
                          )}
                          
                          {message.messageType === 'DOCUMENT' ? (
                            <DocumentMessage message={message} />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          )}
                          
                          {/* Время и статус */}
                          <div className={`flex items-center gap-1 mt-1 ${message.direction === 'OUTGOING' ? 'justify-end' : ''}`}>
                            <span className="text-[10px] opacity-60">{formatMessageTime(message.timestamp)}</span>
                            {message.direction === 'OUTGOING' && (
                              <>
                                {message.status === 'PENDING' && <Clock className="h-3 w-3 opacity-60" />}
                                {message.status === 'SENT' && <CheckCircle className="h-3 w-3 opacity-60" />}
                                {message.status === 'DELIVERED' && <CheckCircle className="h-3 w-3 text-blue-300" />}
                                {message.status === 'READ' && <CheckCircle className="h-3 w-3 text-blue-400" />}
                                {message.status === 'FAILED' && <XCircle className="h-3 w-3 text-red-400" />}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Поле ввода */}
            <div className="flex-shrink-0 border-t p-3 bg-card">
              <div className="flex items-end gap-2">
                <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Textarea
                  placeholder="Введите сообщение..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="min-h-[44px] max-h-32 resize-none flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                >
                  {sendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1">Enter для отправки • Shift+Enter для переноса</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Выберите чат</h2>
            <p className="text-muted-foreground text-center max-w-sm">
              Выберите чат из списка слева для просмотра сообщений и общения
            </p>
          </div>
        )}
      </div>
      
      {/* Диалог привязки к заявке */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Управление привязками чата</DialogTitle>
            <DialogDescription>
              Привяжите чат к заявке и позициям или отвяжите от них
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Заявка</label>
              <select
                value={selectedRequestId}
                onChange={async (e) => {
                  setSelectedRequestId(e.target.value)
                  // Если чат уже привязан к другой заявке, обновляем привязки
                  if (linkingChatId && e.target.value) {
                    await loadChatPositions(linkingChatId)
                  }
                }}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="">Выберите заявку...</option>
                {requests.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.requestNumber} - {request.description || 'Без описания'}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Текущие привязки к позициям */}
            {linkingChatId && selectedRequestId && currentChatPositions.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Текущие привязки к позициям</label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-blue-50">
                  {requests
                    .filter(r => r.id === selectedRequestId)
                    .flatMap(r => r.positions || [])
                    .filter(p => currentChatPositions.includes(p.id))
                    .map((position) => (
                      <div key={position.id} className="flex items-center justify-between p-2 bg-white rounded border border-blue-200">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{position.name}</div>
                          <div className="text-xs text-gray-500">
                            {position.quantity} {position.unit}
                            {position.description && ` - ${position.description}`}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => linkingChatId && unlinkChatFromPosition(linkingChatId, position.id)}
                          disabled={unlinkingPosition === position.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {unlinkingPosition === position.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Отвязать'
                          )}
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Выбор позиций для привязки */}
            {selectedRequestId && (
              <div>
                <label className="text-sm font-medium">Позиции для привязки (можно выбрать несколько)</label>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                  {requests
                    .filter(r => r.id === selectedRequestId)
                    .flatMap(r => r.positions || [])
                    .map((position) => {
                      const isLinked = currentChatPositions.includes(position.id)
                      return (
                        <div key={position.id} className={`flex items-center space-x-2 p-2 hover:bg-gray-50 rounded ${isLinked ? 'bg-green-50 border border-green-200' : ''}`}>
                          <input
                            type="checkbox"
                            id={`position-${position.id}`}
                            value={position.id}
                            className="rounded"
                            defaultChecked={!isLinked} // Не выбираем уже привязанные
                            disabled={isLinked} // Отключаем уже привязанные
                          />
                          <label
                            htmlFor={`position-${position.id}`}
                            className={`flex-1 cursor-pointer text-sm ${isLinked ? 'text-gray-500' : ''}`}
                          >
                            <div className="font-medium">
                              {position.name}
                              {isLinked && <span className="ml-2 text-xs text-green-600">(уже привязана)</span>}
                            </div>
                            <div className="text-gray-500">
                              {position.quantity} {position.unit}
                              {position.description && ` - ${position.description}`}
                            </div>
                          </label>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center mt-4">
            {linkingChatId && currentChatPositions.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => linkingChatId && unlinkChatFromRequest(linkingChatId)}
                disabled={linkingRequest}
              >
                Отвязать от заявки полностью
              </Button>
            )}
            <div className="flex justify-end space-x-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => setShowLinkDialog(false)}
                disabled={linkingRequest}
              >
                Отмена
              </Button>
              <Button
                onClick={linkChatToRequest}
                disabled={!selectedRequestId || linkingRequest}
              >
                {linkingRequest ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Привязка...
                  </>
                ) : (
                  'Привязать'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог создания нового чата */}
      <Dialog open={showCreateChatDialog} onOpenChange={setShowCreateChatDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Создать новый чат</DialogTitle>
            <DialogDescription>
              Введите номер телефона и имя контакта для создания нового чата
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Номер телефона</Label>
              <Input
                id="phone"
                placeholder="+7 (747) 123-33-23"
                value={newChatPhone}
                onChange={(e) => setNewChatPhone(formatPhoneNumber(e.target.value, true))}
                maxLength={18} // +7 (747) 123-33-23 = 18 символов
              />
              <p className="text-xs text-muted-foreground mt-1">
                Формат: +7 (747) 123-33-23
              </p>
            </div>
            <div>
              <Label htmlFor="name">Имя контакта</Label>
              <Input
                id="name"
                placeholder="Введите имя контакта"
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateChatDialog(false)
                  setNewChatPhone('')
                  setNewChatName('')
                }}
                disabled={creatingChat}
              >
                Отмена
              </Button>
              <Button
                onClick={createNewChat}
                disabled={creatingChat || !newChatPhone.trim() || !newChatName.trim()}
              >
                {creatingChat ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  'Создать чат'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
