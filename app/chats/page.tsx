"use client"

import { useState } from "react"
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
} from "lucide-react"

export default function ChatsPage() {
  const [selectedChat, setSelectedChat] = useState<number | null>(1)
  const [newMessage, setNewMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const chats = [
    {
      id: 1,
      clientName: "ТОО Строй Комплект",
      lastMessage: "Александр предложил 3 варианта поставщиков",
      timestamp: "14:30",
      status: "активный",
      unreadCount: 2,
      requestId: "REQ-001",
      avatar: "СК",
      managerName: "Александр Петров",
    },
    {
      id: 2,
      clientName: "ИП Офис Центр",
      lastMessage: "Спасибо за помощь с выбором поставщика",
      timestamp: "13:45",
      status: "ожидание",
      unreadCount: 0,
      requestId: "REQ-002",
      avatar: "ОЦ",
      managerName: "Мария Иванова",
    },
    {
      id: 3,
      clientName: "ООО Техно Плюс",
      lastMessage: "Получил файл спецификации, изучаю",
      timestamp: "12:20",
      status: "завершен",
      unreadCount: 1,
      requestId: "REQ-003",
      avatar: "ТП",
      managerName: "Дмитрий Козлов",
    },
    {
      id: 4,
      clientName: "ТОО Мебель Сити",
      lastMessage: "Нужны уточнения по заявке",
      timestamp: "11:15",
      status: "активный",
      unreadCount: 3,
      requestId: "REQ-004",
      avatar: "МС",
      managerName: "Елена Смирнова",
    },
  ]

  const messages = [
    {
      id: 1,
      sender: "manager",
      content:
        "Добрый день! Меня зовут Александр Петров, я ваш менеджер по закупкам. Получил вашу заявку REQ-001 на строительные материалы. Уже начал работу с поставщиками и нашел несколько интересных предложений.",
      timestamp: "14:25",
      type: "text",
      senderName: "Александр Петров",
    },
    {
      id: 2,
      sender: "manager",
      content: "Подготовил для вас сравнение от трех проверенных поставщиков:",
      timestamp: "14:26",
      type: "text",
      senderName: "Александр Петров",
      attachments: [
        {
          name: "Коммерческие_предложения.pdf",
          size: "2.4 МБ",
          type: "pdf",
        },
      ],
    },
    {
      id: 3,
      sender: "user",
      content: "Спасибо, Александр! Изучу предложения. Есть ли возможность получить скидку от первого поставщика?",
      timestamp: "14:28",
      type: "text",
    },
    {
      id: 4,
      sender: "manager",
      content:
        "Отлично! Связался с ТОО СтройМатериалы КЗ. Они готовы предоставить скидку 5% при заказе на сумму свыше 500,000 тенге. Ваша заявка на 750,000 тенге подходит под эти условия. Итоговая сумма составит 712,500 тенге.",
      timestamp: "14:30",
      type: "text",
      senderName: "Александр Петров",
    },
    {
      id: 5,
      sender: "user",
      content: "Отлично! Принимаю это предложение. Когда можно оформить договор?",
      timestamp: "14:32",
      type: "text",
      attachments: [
        {
          name: "Доверенность_на_закупку.pdf",
          size: "1.2 МБ",
          type: "pdf",
        },
      ],
    },
    {
      id: 6,
      sender: "manager",
      content:
        "Прекрасно! Договор можем оформить сегодня. Подготовлю все документы и отправлю на согласование в течение часа. Также организую встречу с поставщиком на завтра в 10:00, если вам удобно.",
      timestamp: "14:35",
      type: "text",
      senderName: "Александр Петров",
    },
  ]

  const getStatusBadge = (status: string) => {
    const variants = {
      активный: { variant: "default" as const, icon: MessageSquare },
      ожидание: { variant: "secondary" as const, icon: Clock },
      завершен: { variant: "outline" as const, icon: CheckCircle },
    }

    const config = variants[status as keyof typeof variants]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
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

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Здесь будет логика отправки сообщения
      console.log("Отправка сообщения:", newMessage)
      setNewMessage("")
    }
  }

  const filteredChats = chats.filter(
    (chat) =>
      chat.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.requestId.toLowerCase().includes(searchTerm.toLowerCase()),
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
                    <AvatarFallback>{currentChat?.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{currentChat?.clientName}</CardTitle>
                    <CardDescription>
                      Заявка {currentChat?.requestId} • Менеджер: {currentChat?.managerName} •{" "}
                      {getStatusBadge(currentChat?.status || "")}
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
                    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex items-start space-x-2 max-w-[70%] ${
                        message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        {message.sender === "manager" ? (
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {message.senderName
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("") || "М"}
                          </AvatarFallback>
                        ) : (
                          <AvatarFallback className="bg-secondary">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div
                        className={`rounded-lg p-3 ${
                          message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {message.sender === "manager" && (
                          <p className="text-xs font-medium mb-1 opacity-70">{message.senderName}</p>
                        )}
                        <p className="text-sm">{message.content}</p>

                        {/* Вложения */}
                        {message.attachments && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map((attachment, index) => (
                              <div
                                key={index}
                                className={`flex items-center space-x-2 p-2 rounded border ${
                                  message.sender === "user"
                                    ? "border-primary-foreground/20 bg-primary-foreground/10"
                                    : "border-border bg-background"
                                }`}
                              >
                                {getFileIcon(attachment.type)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{attachment.name}</p>
                                  <p className="text-xs opacity-70">{attachment.size}</p>
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-xs opacity-70 mt-2">{message.timestamp}</p>
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
                  <Button onClick={handleSendMessage} size="sm">
                    <Send className="h-4 w-4" />
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
                {filteredChats.map((chat) => (
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
                          <AvatarFallback className="text-xs">{chat.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{chat.clientName}</p>
                            <span className="text-xs text-muted-foreground">{chat.timestamp}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">{chat.lastMessage}</p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="outline" className="text-xs">
                              {chat.requestId}
                            </Badge>
                            {getStatusBadge(chat.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Менеджер: {chat.managerName}</p>
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
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
