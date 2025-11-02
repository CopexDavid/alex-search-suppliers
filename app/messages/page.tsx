'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  MessageSquare, 
  Phone, 
  Clock, 
  CheckCircle, 
  XCircle,
  Search,
  RefreshCw,
  Filter
} from 'lucide-react'

interface IncomingMessage {
  id: string
  messageId: string
  phoneNumber: string
  message: string
  messageType: string
  chatId: string
  timestamp: string
  source: string
  processed: boolean
  createdAt: string
}

interface MessagesResponse {
  messages: IncomingMessage[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<IncomingMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchPhone, setSearchPhone] = useState('')
  const [filterProcessed, setFilterProcessed] = useState<string>('all')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })

  const loadMessages = async (page = 1) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })

      if (searchPhone) {
        params.append('phoneNumber', searchPhone)
      }

      if (filterProcessed !== 'all') {
        params.append('processed', filterProcessed)
      }

      const response = await fetch(`/api/whatsapp/messages?${params}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Ошибка загрузки сообщений')
      }

      const data: { success: boolean; data: MessagesResponse } = await response.json()

      if (data.success) {
        setMessages(data.data.messages)
        setPagination(data.data.pagination)
      } else {
        throw new Error('Неверный ответ сервера')
      }
    } catch (error: any) {
      console.error('Error loading messages:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const markAsProcessed = async (messageIds: string[], processed: boolean) => {
    try {
      const response = await fetch('/api/whatsapp/messages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ messageIds, processed })
      })

      if (response.ok) {
        await loadMessages(pagination.page)
      } else {
        throw new Error('Ошибка обновления статуса')
      }
    } catch (error: any) {
      console.error('Error updating message status:', error)
      alert(`Ошибка: ${error.message}`)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [])

  const handleSearch = () => {
    loadMessages(1)
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ru-RU')
  }

  const formatPhoneNumber = (phone: string) => {
    return phone.startsWith('+') ? phone : `+${phone}`
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Входящие сообщения</h1>
          <p className="text-muted-foreground">
            Просмотр и управление входящими сообщениями WhatsApp
          </p>
        </div>
        <Button onClick={() => loadMessages(pagination.page)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Поиск по номеру телефона..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <select
              value={filterProcessed}
              onChange={(e) => setFilterProcessed(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">Все сообщения</option>
              <option value="false">Необработанные</option>
              <option value="true">Обработанные</option>
            </select>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Найти
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Всего сообщений</p>
                <p className="text-2xl font-bold">{pagination.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Обработанные</p>
                <p className="text-2xl font-bold">
                  {messages.filter(m => m.processed).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Необработанные</p>
                <p className="text-2xl font-bold">
                  {messages.filter(m => !m.processed).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ошибка */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Список сообщений */}
      <Card>
        <CardHeader>
          <CardTitle>Сообщения</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Загрузка сообщений...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Сообщения не найдены</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 border rounded-lg ${
                    message.processed ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatPhoneNumber(message.phoneNumber)}</span>
                        <Badge variant={message.processed ? 'default' : 'secondary'}>
                          {message.processed ? 'Обработано' : 'Новое'}
                        </Badge>
                        <Badge variant="outline">{message.source}</Badge>
                      </div>
                      <p className="text-sm mb-2">{message.message}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTimestamp(message.timestamp)}
                      </div>
                    </div>
                    <div className="ml-4">
                      <Button
                        size="sm"
                        variant={message.processed ? "outline" : "default"}
                        onClick={() => markAsProcessed([message.id], !message.processed)}
                      >
                        {message.processed ? (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Отменить
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Обработать
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Пагинация */}
          {pagination.pages > 1 && (
            <div className="flex justify-center space-x-2 mt-6">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => loadMessages(pagination.page - 1)}
              >
                Назад
              </Button>
              <span className="flex items-center px-4">
                Страница {pagination.page} из {pagination.pages}
              </span>
              <Button
                variant="outline"
                disabled={pagination.page === pagination.pages}
                onClick={() => loadMessages(pagination.page + 1)}
              >
                Далее
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
