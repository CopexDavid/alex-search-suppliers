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
} from "lucide-react"
import { MessageLogsDialog } from "@/components/message-logs-dialog"

interface Chat {
  id: string
  phoneNumber: string
  contactName?: string
  requestId?: string
  lastMessage?: string
  lastMessageAt?: string
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

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })
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
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Основной чат - левая часть */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedChat ? (
          <Card className="flex-1 flex flex-col h-full">
            {/* Заголовок чата */}
            <CardHeader className="border-b pb-4 flex-shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3 min-w-0">
                  <Avatar className="flex-shrink-0">
                    <AvatarFallback>{getInitials(currentChat?.contactName, currentChat?.phoneNumber)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate">
                      {currentChat?.contactName || formatPhoneNumber(currentChat?.phoneNumber || '')}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2 text-sm">
                      {currentChat?.request?.requestNumber && (
                        <span>Заявка {currentChat.request.requestNumber}</span>
                      )}
                      {currentChat?.assignedUser && (
                        <span>Менеджер: {currentChat.assignedUser.name}</span>
                      )}
                      {currentChat?.status && getStatusBadge(currentChat.status)}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {/* Кнопка привязки к заявке - всегда открывает диалог управления привязками */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openLinkDialog(currentChat?.id || '')}
                    title={currentChat?.request ? "Управление привязками" : "Привязать к заявке"}
                    className="hidden sm:flex"
                  >
                    <Link className="h-4 w-4 mr-1" />
                    {currentChat?.request ? 'Управление' : 'К заявке'}
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="hidden md:flex">
                        <FileText className="mr-2 h-4 w-4" />
                        Детали
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Детали заявки {currentChat?.request?.requestNumber}</DialogTitle>
                        <DialogDescription>Информация о заявке и ходе обработки</DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[60vh]">
                        <div className="space-y-4 pr-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Клиент</Label>
                              <p className="text-sm text-muted-foreground">{currentChat?.contactName || 'Не указан'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Менеджер</Label>
                              <p className="text-sm text-muted-foreground">{currentChat?.assignedUser?.name || 'Не назначен'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Статус</Label>
                              <p className="text-sm text-muted-foreground">{currentChat?.status}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Телефон</Label>
                              <p className="text-sm text-muted-foreground">{formatPhoneNumber(currentChat?.phoneNumber || '')}</p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Описание заявки</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {currentChat?.request?.description || 'Описание не указано'}
                            </p>
                          </div>
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Сообщения */}
            <div className="flex-1 overflow-hidden relative">
              <ScrollArea className="h-full" type="always">
                <div className="p-4 space-y-4 pb-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Нет сообщений в этом чате</p>
                      <p className="text-xs text-muted-foreground mt-2">Начните общение, отправив первое сообщение</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.direction === "INCOMING" ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`flex items-start space-x-2 max-w-[85%] sm:max-w-[70%] ${
                            message.direction === "INCOMING" ? "" : "flex-row-reverse space-x-reverse"
                          }`}
                        >
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            {message.direction === "OUTGOING" ? (
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {message.sender?.split(" ").map((n) => n[0]).join("") || "М"}
                              </AvatarFallback>
                            ) : (
                              <AvatarFallback className="bg-secondary text-xs">
                                {getInitials(currentChat?.contactName, currentChat?.phoneNumber)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div
                            className={`rounded-2xl p-3 break-words shadow-sm ${
                              message.direction === "INCOMING" 
                                ? "bg-muted border border-border/50" 
                                : "bg-primary text-primary-foreground"
                            }`}
                          >
                            {message.direction === "OUTGOING" && message.sender && (
                              <p className="text-xs font-medium mb-1 opacity-70">{message.sender}</p>
                            )}
                            
                            {/* Отображение контента в зависимости от типа сообщения */}
                            {message.messageType === 'DOCUMENT' ? (
                              <DocumentMessage message={message} />
                            ) : (
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                            )}

                            {/* Статус сообщения */}
                            {message.direction === "OUTGOING" && (
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-xs opacity-70">{formatTimestamp(message.timestamp)}</p>
                                <div className="flex items-center space-x-1">
                                  {message.status === 'PENDING' && (
                                    <Clock className="h-3 w-3 opacity-70" />
                                  )}
                                  {message.status === 'SENT' && (
                                    <CheckCircle className="h-3 w-3 opacity-70" />
                                  )}
                                  {message.status === 'FAILED' && (
                                    <XCircle className="h-3 w-3 text-red-500" />
                                  )}
                                </div>
                              </div>
                            )}

                            {message.direction === "INCOMING" && (
                              <p className="text-xs opacity-70 mt-2">{formatTimestamp(message.timestamp)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Поле ввода */}
            <div className="border-t p-4 flex-shrink-0">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <Textarea
                    placeholder="Введите сообщение..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[60px] max-h-[120px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="hidden sm:flex">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={handleSendMessage} 
                    size="sm"
                    disabled={sendingMessage || !newMessage.trim()}
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Статус */}
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="hidden sm:inline">{currentChat?.assignedUser?.name || 'Менеджер'} онлайн</span>
                    <span className="sm:hidden">Онлайн</span>
                  </div>
                </div>
                <span className="hidden sm:inline">Enter для отправки</span>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Выберите чат</h3>
              <p className="text-muted-foreground">Выберите чат из списка для начала общения</p>
            </div>
          </Card>
        )}
      </div>

      {/* Список чатов - правая часть */}
      <div className="w-full lg:w-80 flex flex-col order-first lg:order-last">
        <Card className="flex-1 h-full flex flex-col">
          {/* Верхняя навигационная панель */}
          <div className="border-b bg-muted/30">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Чаты</h2>
                  <Badge variant="secondary" className="text-xs">
                    {filteredChats.length}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateChatDialog(true)}
                    className="h-8 w-8 p-0"
                    title="Создать новый чат"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      loadChats()
                      if (selectedChat) {
                        loadMessages(selectedChat)
                      }
                    }}
                    disabled={loading}
                    className="h-8 w-8 p-0"
                    title="Обновить чаты"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  <MessageLogsDialog />
                </div>
              </div>
              
              {/* Поиск */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по клиентам и заявкам..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>
          </div>

          {/* Список чатов с независимым скроллом */}
          <div className="flex-1 relative overflow-hidden">
            <ScrollArea className="h-full" type="always">
              <div className="p-3">
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Загрузка чатов...</p>
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? 'Чаты не найдены' : 'Нет активных чатов'}
                    </p>
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchTerm('')}
                        className="mt-2"
                      >
                        Очистить поиск
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredChats.map((chat) => (
                      <div
                        key={chat.id}
                        className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                          selectedChat === chat.id 
                            ? "bg-primary/5 border-primary/20 shadow-sm" 
                            : "hover:bg-accent/50 border-transparent hover:border-border"
                        }`}
                        onClick={() => setSelectedChat(chat.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="relative">
                            <Avatar className="h-11 w-11 flex-shrink-0 ring-2 ring-background">
                              <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-primary/20 to-primary/10">
                                {getInitials(chat.contactName, chat.phoneNumber)}
                              </AvatarFallback>
                            </Avatar>
                            {chat.status === 'ACTIVE' && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-sm font-medium truncate pr-2">
                                {chat.contactName || formatPhoneNumber(chat.phoneNumber)}
                              </h3>
                              <div className="flex items-center space-x-1 flex-shrink-0">
                                {chat.lastMessageAt && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimestamp(chat.lastMessageAt)}
                                  </span>
                                )}
                                {chat.unreadCount > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="h-5 w-5 p-0 flex items-center justify-center text-xs font-medium"
                                  >
                                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-xs text-muted-foreground mb-2 truncate leading-relaxed">
                              {chat.lastMessage || 'Нет сообщений'}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1.5">
                                {chat.request?.requestNumber && (
                                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                                    {chat.request.requestNumber}
                                  </Badge>
                                )}
                                <div className="scale-90">
                                  {getStatusBadge(chat.status)}
                                </div>
                              </div>
                            </div>
                            
                            {chat.assignedUser && (
                              <div className="flex items-center mt-2 pt-2 border-t border-border/50">
                                <User className="h-3 w-3 text-muted-foreground mr-1" />
                                <p className="text-xs text-muted-foreground truncate">
                                  {chat.assignedUser.name}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Индикатор выбранного чата */}
                        {selectedChat === chat.id && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"></div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          
          {/* Нижняя информационная панель */}
          <div className="border-t bg-muted/20 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Онлайн</span>
                </div>
              </div>
              <span>Всего: {chats.length} чатов</span>
            </div>
          </div>
        </Card>
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
