"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Brain,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Building2,
  Calendar,
  Package,
  RefreshCw,
  ArrowRight,
  Eye,
  TrendingUp,
  RotateCcw,
} from "lucide-react"
import Link from "next/link"

interface Request {
  id: string
  requestNumber: string
  description: string
  status: string
  createdAt: string
  positions: {
    id: string
    name: string
    quantity: number
    unit: string
    quotesReceived: number
  }[]
  commercialOffers: {
    id: string
    company: string
    totalPrice: number
    currency: string
    confidence: number
  }[]
  creator: {
    name: string
    email: string
  }
}

export default function AIAnalysisPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [resettingCounters, setResettingCounters] = useState<string | null>(null)

  // Загрузка заявок готовых к анализу
  const loadRequests = async () => {
    try {
      setLoading(true)
      console.log('🔍 Загружаем заявки для ИИ анализа...')
      
      const response = await fetch('/api/requests?status=PENDING_QUOTES,COMPARING', {
        credentials: 'include'
      })
      
      console.log('📡 Ответ API:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Данные от API:', data)
        
        const requests = data.data || data.requests || []
        console.log('📋 Найдено заявок:', requests.length)
        
        setRequests(requests)
      } else if (response.status === 401) {
        console.error('❌ Ошибка авторизации - перенаправляем на логин')
        window.location.href = '/auth/login'
      } else {
        const errorText = await response.text()
        console.error('❌ Ошибка API:', response.status, errorText)
      }
    } catch (error) {
      console.error('Error loading requests:', error)
    } finally {
      setLoading(false)
    }
  }

  // Форматирование даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Форматирование цены
  const formatPrice = (price: number, currency: string = 'KZT') => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ' + currency
  }

  // Получение статистики по заявке
  const getRequestStats = (request: Request) => {
    const totalOffers = request.commercialOffers?.length || 0
    const totalPositions = request.positions?.length || 0
    const positionsWithOffers = request.positions?.filter(p => p.quotesReceived > 0).length || 0
    const completionRate = totalPositions > 0 ? Math.round((positionsWithOffers / totalPositions) * 100) : 0
    
    const minPrice = totalOffers > 0 ? Math.min(...request.commercialOffers.map(o => o.totalPrice)) : 0
    const maxPrice = totalOffers > 0 ? Math.max(...request.commercialOffers.map(o => o.totalPrice)) : 0
    
    return {
      totalOffers,
      totalPositions,
      positionsWithOffers,
      completionRate,
      minPrice,
      maxPrice,
      priceRange: maxPrice - minPrice
    }
  }

  // Сброс счетчиков КП для заявки
  const resetQuotesCounters = async (requestId: string) => {
    if (!confirm('Вы уверены, что хотите пересчитать счетчики КП для всех позиций этой заявки?')) {
      return
    }

    try {
      setResettingCounters(requestId)
      
      const response = await fetch(`/api/requests/${requestId}/reset-quotes-counters`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ ${data.message}`)
        // Перезагружаем список заявок
        await loadRequests()
      } else {
        const errorData = await response.json()
        alert(`❌ Ошибка: ${errorData.error || 'Не удалось сбросить счетчики'}`)
      }
    } catch (error) {
      console.error('Error resetting quotes counters:', error)
      alert('❌ Ошибка при сбросе счетчиков')
    } finally {
      setResettingCounters(null)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-muted-foreground">Загрузка заявок...</p>
        </div>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Нет заявок для анализа</h2>
          <p className="text-muted-foreground mb-4">
            Заявки появятся здесь после получения коммерческих предложений от поставщиков
          </p>
          <Button onClick={loadRequests} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Обновить
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Brain className="mr-3 h-8 w-8 text-blue-600" />
            ИИ Анализ коммерческих предложений
          </h1>
          <p className="text-muted-foreground mt-1">
            Выберите заявку для анализа полученных предложений от поставщиков
          </p>
        </div>
        <Button onClick={loadRequests} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Обновить
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Заявок</p>
                <p className="text-2xl font-bold">{requests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Позиций</p>
                <p className="text-2xl font-bold">
                  {requests.reduce((sum, r) => sum + (r.positions?.length || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">КП получено</p>
                <p className="text-2xl font-bold">
                  {requests.reduce((sum, r) => sum + (r.commercialOffers?.length || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Готово к анализу</p>
                <p className="text-2xl font-bold">
                  {requests.filter(r => (r.commercialOffers?.length || 0) > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список заявок */}
      <div className="grid gap-6">
        {requests.map((request) => {
          const stats = getRequestStats(request)
          
          return (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{request.requestNumber}</CardTitle>
                      <Badge 
                        variant={request.status === 'COMPARING' ? 'default' : 'secondary'}
                        className={request.status === 'COMPARING' ? 'bg-blue-600' : ''}
                      >
                        {request.status}
                      </Badge>
                      {stats.totalOffers > 0 && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {stats.totalOffers} КП
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-base mb-3">
                      {request.description}
                    </CardDescription>
                    
                    {/* Информация о заявке */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="mr-2 h-4 w-4" />
                        {formatDate(request.createdAt)}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Package className="mr-2 h-4 w-4" />
                        Позиций: {stats.totalPositions}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Building2 className="mr-2 h-4 w-4" />
                        КП: {stats.totalOffers}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Готовность: {stats.completionRate}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-6 text-right">
                    <div className="flex flex-col gap-2">
                    <Link href={`/ai-analysis/${request.id}`}>
                        <Button className="w-full">
                        <Brain className="mr-2 h-4 w-4" />
                        Анализ ИИ
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => resetQuotesCounters(request.id)}
                        disabled={resettingCounters === request.id}
                        className="w-full"
                      >
                        {resettingCounters === request.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Пересчет...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Сбросить счетчик КП
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Инициатор: {request.creator?.name}
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Прогресс получения КП */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Прогресс получения КП</span>
                    <span>{stats.positionsWithOffers} из {stats.totalPositions} позиций</span>
                  </div>
                  <Progress value={stats.completionRate} className="h-2" />
                </div>
                
                {/* Диапазон цен */}
                {stats.totalOffers > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Диапазон цен:</span>
                      <div className="flex items-center gap-4">
                        <span className="text-green-600 font-medium">
                          от {formatPrice(stats.minPrice)}
                        </span>
                        <span className="text-muted-foreground">до</span>
                        <span className="text-red-600 font-medium">
                          {formatPrice(stats.maxPrice)}
                        </span>
                        {stats.priceRange > 0 && (
                          <Badge variant="outline" className="ml-2">
                            разброс {formatPrice(stats.priceRange)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Позиции */}
                {request.positions && request.positions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Позиции заявки:</h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      {request.positions.slice(0, 4).map((position) => (
                        <div 
                          key={position.id}
                          className="flex items-center justify-between p-2 bg-white border rounded text-sm"
                        >
                          <div className="flex-1 truncate">
                            <span className="font-medium">{position.name}</span>
                            <span className="text-muted-foreground ml-2">
                              {position.quantity} {position.unit}
                            </span>
                          </div>
                          <Badge 
                            variant={position.quotesReceived > 0 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {position.quotesReceived} КП
                          </Badge>
                        </div>
                      ))}
                      {request.positions.length > 4 && (
                        <div className="text-xs text-muted-foreground p-2">
                          +{request.positions.length - 4} позиций...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}