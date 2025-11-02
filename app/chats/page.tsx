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
} from "lucide-react"

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
  metadata?: any
  timestamp: string
  createdAt: string
}

export default function ChatsPage() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)

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

  const formatPhoneNumber = (phone: string) => {
    return phone.startsWith('+') ? phone : `+${phone}`
  }

  const getInitials = (name?: string, phone?: string) => {
    if (name && name !== phone) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return phone?.slice(-2) || '??'
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />
      case "image":
        return <ImageIcon className="h-4 w-4 text-blue-500" />
      default:
        return <File className="h-4 w-4 text-gray-500" />
    }
  }

  const filteredChats = chats.filter(
    (chat) =>
      (chat.contactName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (chat.phoneNumber.includes(searchTerm)) ||
      (chat.request?.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const currentChat = chats.find((c) => c.id === selectedChat)

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Основной чат - левая часть */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <Card className="flex-1 flex flex-col">
            {/* Заголовок чата */}
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(currentChat?.contactName, currentChat?.phoneNumber)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {currentChat?.contactName || formatPhoneNumber(currentChat?.phoneNumber || '')}
                    </CardTitle>
                    <CardDescription>
                      {currentChat?.request?.requestNumber && (
                        <>Заявка {currentChat.request.requestNumber} • </>
                      )}
                      {currentChat?.assignedUser && (
                        <>Менеджер: {currentChat.assignedUser.name} • </>
                      )}
                      {currentChat?.status && getStatusBadge(currentChat.status)}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        Детали заявки
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Детали заявки {currentChat?.requestId}</DialogTitle>
                        <DialogDescription>Информация о заявке и ходе обработки</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Клиент</Label>
                            <p className="text-sm text-muted-foreground">{currentChat?.clientName}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Менеджер</Label>
                            <p className="text-sm text-muted-foreground">{currentChat?.managerName}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Дата создания</Label>
                            <p className="text-sm text-muted-foreground">15.01.2024</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Категория</Label>
                            <p className="text-sm text-muted-foreground">Строительные материалы</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Сумма</Label>
                            <p className="text-sm text-muted-foreground">750,000 тенге</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Статус</Label>
                            <p className="text-sm text-muted-foreground">{currentChat?.status}</p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Описание</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Закупка строительных материалов для строительства офисного здания. Требуется цемент,
                            арматура, кирпич согласно спецификации.
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Сообщения */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === "INCOMING" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`flex items-start space-x-2 max-w-[70%] ${
                        message.direction === "INCOMING" ? "" : "flex-row-reverse space-x-reverse"
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        {message.direction === "OUTGOING" ? (
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {message.sender?.split(" ").map((n) => n[0]).join("") || "М"}
                          </AvatarFallback>
                        ) : (
                          <AvatarFallback className="bg-secondary">
                            {getInitials(currentChat?.contactName, currentChat?.phoneNumber)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div
                        className={`rounded-lg p-3 ${
                          message.direction === "INCOMING" ? "bg-muted" : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {message.direction === "OUTGOING" && message.sender && (
                          <p className="text-xs font-medium mb-1 opacity-70">{message.sender}</p>
                        )}
                        <p className="text-sm">{message.content}</p>

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
                ))}
              </div>
            </ScrollArea>

            {/* Поле ввода */}
            <div className="border-t p-4">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <Textarea
                    placeholder="Введите сообщение..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <Button variant="outline" size="sm">
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
                    <span>{currentChat?.managerName} онлайн</span>
                  </div>
                </div>
                <span>Нажмите Enter для отправки</span>
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
      <div className="w-80 flex flex-col">
        <Card className="flex-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                Чаты
              </CardTitle>
              <Badge variant="secondary">{filteredChats.length} активных</Badge>
            </div>
            <CardDescription>Общение менеджеров с клиентами</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Поиск */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по клиентам или заявкам..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Список чатов */}
            <ScrollArea className="h-[calc(100vh-20rem)]">
              <div className="p-2">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Загрузка чатов...</p>
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Чаты не найдены</p>
                  </div>
                ) : (
                  filteredChats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                        selectedChat === chat.id ? "bg-primary/10 border border-primary/20" : "hover:bg-accent"
                      }`}
                      onClick={() => setSelectedChat(chat.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-xs">
                              {getInitials(chat.contactName, chat.phoneNumber)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate">
                                {chat.contactName || formatPhoneNumber(chat.phoneNumber)}
                              </p>
                              {chat.lastMessageAt && (
                                <span className="text-xs text-muted-foreground">
                                  {formatTimestamp(chat.lastMessageAt)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {chat.lastMessage || 'Нет сообщений'}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              {chat.request?.requestNumber && (
                                <Badge variant="outline" className="text-xs">
                                  {chat.request.requestNumber}
                                </Badge>
                              )}
                              {getStatusBadge(chat.status)}
                            </div>
                            {chat.assignedUser && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Менеджер: {chat.assignedUser.name}
                              </p>
                            )}
                          </div>
                        </div>
                        {chat.unreadCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                          >
                            {chat.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
