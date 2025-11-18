// Диалог для просмотра логов отправленных сообщений
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Filter,
  Download,
  RefreshCw,
  Phone,
  User,
  Calendar,
} from "lucide-react"

interface MessageLog {
  id: string
  messageId?: string
  direction: string
  sender?: string
  content: string
  messageType: string
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
  timestamp: string
  createdAt: string
  metadata?: any
  chat: {
    id: string
    phoneNumber: string
    contactName?: string
    request?: {
      id: string
      requestNumber: string
      description?: string
    }
    assignedUser?: {
      id: string
      name: string
      email: string
    }
  }
}

interface MessageLogsStats {
  sent: number
  failed: number
  pending: number
  total: number
}

interface MessageLogsDialogProps {
  trigger?: React.ReactNode
}

export function MessageLogsDialog({ trigger }: MessageLogsDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<MessageLog[]>([])
  const [stats, setStats] = useState<MessageLogsStats>({ sent: 0, failed: 0, pending: 0, total: 0 })
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 })
  
  // Фильтры
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [phoneFilter, setPhoneFilter] = useState("")
  const [dateFromFilter, setDateFromFilter] = useState("")
  const [dateToFilter, setDateToFilter] = useState("")

  const loadLogs = async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })
      
      if (statusFilter) params.append('status', statusFilter)
      if (phoneFilter) params.append('phoneNumber', phoneFilter)
      if (dateFromFilter) params.append('dateFrom', dateFromFilter)
      if (dateToFilter) params.append('dateTo', dateToFilter)
      
      const response = await fetch(`/api/chats/logs?${params}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data.data.messages)
        setStats(data.data.stats)
        setPagination(data.data.pagination)
      } else {
        console.error('Error loading message logs:', response.statusText)
      }
    } catch (error) {
      console.error('Error loading message logs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Загружаем логи при открытии диалога
  useEffect(() => {
    if (open) {
      loadLogs()
    }
  }, [open, statusFilter, phoneFilter, dateFromFilter, dateToFilter])

  const getStatusBadge = (status: string) => {
    const variants = {
      SENT: { variant: "default" as const, icon: CheckCircle, text: "Отправлено", color: "text-green-600" },
      DELIVERED: { variant: "default" as const, icon: CheckCircle, text: "Доставлено", color: "text-blue-600" },
      READ: { variant: "default" as const, icon: CheckCircle, text: "Прочитано", color: "text-purple-600" },
      FAILED: { variant: "destructive" as const, icon: XCircle, text: "Ошибка", color: "text-red-600" },
      PENDING: { variant: "secondary" as const, icon: Clock, text: "Ожидание", color: "text-yellow-600" },
    }

    const config = variants[status as keyof typeof variants] || variants.PENDING
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.text}
      </Badge>
    )
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatPhoneNumber = (phone: string) => {
    return phone.startsWith('+') ? phone : `+${phone}`
  }

  const clearFilters = () => {
    setStatusFilter("")
    setPhoneFilter("")
    setDateFromFilter("")
    setDateToFilter("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Логи отправок
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl md:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            Логи отправленных сообщений
          </DialogTitle>
          <DialogDescription>
            Просмотр истории отправленных сообщений с детальной информацией о статусах доставки
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Статистика */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 px-1">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Отправлено</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.sent}</p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Ошибки</p>
                  <p className="text-lg sm:text-2xl font-bold text-red-600">{stats.failed}</p>
                </div>
                <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Ожидание</p>
                  <p className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Всего</p>
                  <p className="text-lg sm:text-2xl font-bold">{stats.total}</p>
                </div>
                <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Фильтры */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              Фильтры
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Статус</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все статусы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Все статусы</SelectItem>
                    <SelectItem value="SENT">Отправлено</SelectItem>
                    <SelectItem value="DELIVERED">Доставлено</SelectItem>
                    <SelectItem value="READ">Прочитано</SelectItem>
                    <SelectItem value="FAILED">Ошибка</SelectItem>
                    <SelectItem value="PENDING">Ожидание</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Номер телефона</Label>
                <Input
                  id="phone"
                  placeholder="Поиск по номеру..."
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFrom">Дата с</Label>
                <Input
                  id="dateFrom"
                  type="datetime-local"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">Дата по</Label>
                <Input
                  id="dateTo"
                  type="datetime-local"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <Button variant="outline" size="sm" onClick={clearFilters} className="w-full sm:w-auto">
                Очистить фильтры
              </Button>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={() => loadLogs(1)} className="w-full sm:w-auto">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Обновить
                </Button>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Экспорт
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Список сообщений */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full px-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Загрузка логов...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Логи сообщений не найдены</p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((message) => (
                  <Card key={message.id} className="p-3 sm:p-4">
                    <div className="flex flex-col space-y-3">
                      {/* Заголовок */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm sm:text-base truncate">
                            {message.chat.contactName || formatPhoneNumber(message.chat.phoneNumber)}
                          </span>
                          {message.chat.request && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {message.chat.request.requestNumber}
                            </Badge>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(message.status)}
                        </div>
                      </div>

                      {/* Содержимое сообщения */}
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm break-words">{message.content}</p>
                      </div>

                      {/* Метаинформация */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatTimestamp(message.timestamp)}</span>
                          </div>
                          {message.chat.assignedUser && (
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span className="truncate">{message.chat.assignedUser.name}</span>
                            </div>
                          )}
                          {message.messageId && (
                            <span className="truncate">ID: {message.messageId}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {message.messageType}
                          </Badge>
                        </div>
                      </div>

                      {/* Метаданные (если есть) */}
                      {message.metadata && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Метаданные
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                            {JSON.stringify(message.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Пагинация */}
        {pagination.pages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t px-1">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Показано {messages.length} из {pagination.total} сообщений
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadLogs(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="text-xs sm:text-sm"
              >
                Предыдущая
              </Button>
              <span className="flex items-center px-2 sm:px-3 text-xs sm:text-sm whitespace-nowrap">
                {pagination.page} из {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages || loading}
                className="text-xs sm:text-sm"
              >
                Следующая
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
