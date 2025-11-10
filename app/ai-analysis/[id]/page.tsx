"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Brain,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Loader2,
  Building2,
  Calendar,
  DollarSign,
  Package,
  Truck,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Award,
  Users,
  RefreshCw,
  Star,
  ThumbsUp,
  Eye,
  ArrowLeft,
  Save,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

interface CommercialOffer {
  id: string
  company: string
  totalPrice: number
  currency: string
  deliveryTerm?: string
  paymentTerm?: string
  validUntil?: string
  confidence: number
  positions: any[]
  createdAt: string
  fileName: string
}

interface Position {
  id: string
  name: string
  description?: string
  quantity: number
  unit: string
  quotesReceived: number
}

interface Request {
  id: string
  requestNumber: string
  description: string
  status: string
  createdAt: string
  positions: Position[]
  commercialOffers: CommercialOffer[]
  creator: {
    name: string
    email: string
  }
}

interface AIAnalysis {
  bestOffer: string
  reasoning: string
  priceComparison: {
    offerId: string
    company: string
    price: number
    pricePerUnit: number
    savings?: number
    rank: number
  }[]
  riskAssessment: string
  recommendation: string
}

export default function RequestAnalysisPage() {
  const params = useParams()
  const requestId = params.id as string
  
  const [request, setRequest] = useState<Request | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  
  // Состояние для финального выбора
  const [selectedOfferId, setSelectedOfferId] = useState<string>("")
  const [decisionReason, setDecisionReason] = useState<string>("")
  const [finalizing, setFinalizing] = useState(false)
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false)

  // Загрузка заявки
  const loadRequest = async () => {
    try {
      setLoading(true)
      console.log('🔍 Загружаем заявку:', requestId)
      
      const response = await fetch(`/api/requests/${requestId}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Данные заявки:', data)
        
        setRequest(data.data)
        
        // Автоматически выбираем первую позицию
        if (data.data.positions?.length > 0) {
          setSelectedPosition(data.data.positions[0])
        }
      } else if (response.status === 401) {
        window.location.href = '/auth/login'
      } else {
        console.error('❌ Ошибка загрузки заявки:', response.status)
      }
    } catch (error) {
      console.error('Error loading request:', error)
    } finally {
      setLoading(false)
    }
  }

  // ИИ анализ КП для позиции
  const analyzeOffers = async (positionId: string) => {
    if (!request) return

    setAnalyzing(true)
    setAnalysisProgress(0)
    
    try {
      // Имитируем прогресс
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const response = await fetch(`/api/requests/${request.id}/positions/${positionId}/analyze-offers`, {
        method: 'POST',
        credentials: 'include'
      })

      clearInterval(progressInterval)
      setAnalysisProgress(100)

      if (response.ok) {
        const data = await response.json()
        setAiAnalysis(data.analysis)
        console.log('✅ ИИ анализ завершен:', data.analysis)
      } else {
        const errorData = await response.json()
        console.error('❌ Ошибка анализа:', errorData.error)
        alert(`Ошибка анализа: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error analyzing offers:', error)
      alert('Ошибка при выполнении анализа')
    } finally {
      setAnalyzing(false)
      setAnalysisProgress(0)
    }
  }

  // Быстрый выбор поставщика без анализа
  const quickSelectSupplier = (offerId: string) => {
    setSelectedOfferId(offerId)
    setDecisionReason("Выбран проверенный поставщик без дополнительного анализа")
    setShowFinalizeDialog(true)
  }

  // Финализация выбора поставщика
  const finalizeSelection = async () => {
    if (!selectedOfferId || !request) return

    setFinalizing(true)
    
    try {
      const response = await fetch(`/api/requests/${request.id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          selectedOfferId,
          reason: decisionReason
        })
      })

      if (response.ok) {
        alert('✅ Поставщик выбран! Заявка завершена.')
        // Перенаправляем обратно к списку заявок
        window.location.href = '/ai-analysis'
      } else {
        const errorData = await response.json()
        alert(`❌ Ошибка: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error finalizing selection:', error)
      alert('❌ Ошибка при сохранении выбора')
    } finally {
      setFinalizing(false)
      setShowFinalizeDialog(false)
    }
  }

  // Получение КП для выбранной позиции
  const getOffersForPosition = (positionId: string): CommercialOffer[] => {
    if (!request || !request.commercialOffers) return []
    
    return request.commercialOffers.filter(offer => {
      // Пока просто возвращаем все КП для заявки
      return true
    })
  }

  // Определение лучшего предложения по цене
  const getBestOfferByPrice = (offers: CommercialOffer[]): CommercialOffer | null => {
    if (offers.length === 0) return null
    
    return offers.reduce((best, current) => {
      if (!best) return current
      return current.totalPrice < best.totalPrice ? current : best
    })
  }

  // Форматирование цены
  const formatPrice = (price: number, currency: string = 'KZT') => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ' + currency
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

  useEffect(() => {
    if (requestId) {
      loadRequest()
    }
  }, [requestId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-muted-foreground">Загрузка заявки...</p>
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Заявка не найдена</h2>
          <Link href="/ai-analysis">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Вернуться к списку
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Заголовок с навигацией */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/ai-analysis">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              <Brain className="mr-3 h-8 w-8 text-blue-600" />
              {request.requestNumber}
            </h1>
            <p className="text-muted-foreground mt-1">
              Анализ коммерческих предложений
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            {request.status}
          </Badge>
          <Button onClick={loadRequest} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Обновить
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Левая колонка: Информация о заявке и позициях */}
        <div className="lg:col-span-1 space-y-6">
          {/* Информация о заявке */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Информация о заявке
              </CardTitle>
              <CardDescription>{request.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center text-sm">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                Создана: {formatDate(request.createdAt)}
              </div>
              <div className="flex items-center text-sm">
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                Инициатор: {request.creator?.name}
              </div>
              <div className="flex items-center text-sm">
                <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                Позиций: {request.positions.length}
              </div>
              <div className="flex items-center text-sm">
                <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                КП получено: {request.commercialOffers?.length || 0}
              </div>
            </CardContent>
          </Card>

          {/* Позиции заявки */}
          <Card>
            <CardHeader>
              <CardTitle>Позиции для анализа</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {request.positions.map((position) => {
                  const offers = getOffersForPosition(position.id)
                  return (
                    <div
                      key={position.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPosition?.id === position.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedPosition(position)
                        setAiAnalysis(null)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{position.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {position.quantity} {position.unit}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={offers.length > 0 ? "default" : "secondary"} className="text-xs">
                            {offers.length} КП
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Правая колонка: Анализ КП */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPosition && (
            <>
              {/* Заголовок позиции и кнопки анализа */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Package className="mr-2 h-5 w-5" />
                        {selectedPosition.name}
                      </CardTitle>
                      <CardDescription>
                        Количество: {selectedPosition.quantity} {selectedPosition.unit}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => analyzeOffers(selectedPosition.id)}
                        disabled={analyzing || getOffersForPosition(selectedPosition.id).length === 0}
                        className="min-w-[140px]"
                      >
                        {analyzing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Анализ...
                          </>
                        ) : (
                          <>
                            <Brain className="mr-2 h-4 w-4" />
                            Анализ ИИ
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {analyzing && (
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Прогресс анализа</span>
                        <span>{analysisProgress}%</span>
                      </div>
                      <Progress value={analysisProgress} className="w-full" />
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Коммерческие предложения */}
              <Card>
                <CardHeader>
                  <CardTitle>Полученные коммерческие предложения</CardTitle>
                  <CardDescription>
                    Сравнение предложений от поставщиков
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const offers = getOffersForPosition(selectedPosition.id)
                    const bestOffer = getBestOfferByPrice(offers)
                    
                    if (offers.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">
                            Коммерческие предложения для этой позиции не получены
                          </p>
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-4">
                        {offers.map((offer) => {
                          const isBest = bestOffer?.id === offer.id
                          const pricePerUnit = offer.totalPrice / selectedPosition.quantity
                          
                          return (
                            <div
                              key={offer.id}
                              className={`p-4 border rounded-lg ${
                                isBest 
                                  ? 'border-green-500 bg-green-50' 
                                  : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-medium">{offer.company}</h4>
                                    {isBest && (
                                      <Badge variant="default" className="bg-green-600">
                                        <Star className="mr-1 h-3 w-3" />
                                        Лучшая цена
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs">
                                      {offer.confidence}% точность
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                    <div>
                                      <span className="text-muted-foreground">Общая сумма:</span>
                                      <p className="font-medium text-lg">
                                        {formatPrice(offer.totalPrice, offer.currency)}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">За единицу:</span>
                                      <p className="font-medium">
                                        {formatPrice(pricePerUnit, offer.currency)}
                                      </p>
                                    </div>
                                    {offer.deliveryTerm && (
                                      <div>
                                        <span className="text-muted-foreground">Срок поставки:</span>
                                        <p>{offer.deliveryTerm}</p>
                                      </div>
                                    )}
                                    {offer.paymentTerm && (
                                      <div>
                                        <span className="text-muted-foreground">Условия оплаты:</span>
                                        <p>{offer.paymentTerm}</p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>📄 {offer.fileName}</span>
                                    <span>📅 {formatDate(offer.createdAt)}</span>
                                  </div>
                                </div>
                                
                                <div className="ml-4 flex flex-col gap-2">
                                  <Button variant="outline" size="sm">
                                    <Eye className="mr-1 h-3 w-3" />
                                    Просмотр
                                  </Button>
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    onClick={() => quickSelectSupplier(offer.id)}
                                    className="bg-orange-600 hover:bg-orange-700"
                                  >
                                    <Zap className="mr-1 h-3 w-3" />
                                    Выбрать
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>

              {/* Результат ИИ анализа */}
              {aiAnalysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Brain className="mr-2 h-5 w-5 text-blue-600" />
                        Результат ИИ анализа
                      </div>
                      <Button 
                        onClick={() => {
                          if (aiAnalysis.bestOffer) {
                            setSelectedOfferId(aiAnalysis.bestOffer)
                            setDecisionReason(aiAnalysis.recommendation)
                            setShowFinalizeDialog(true)
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Принять рекомендацию
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Рекомендация ИИ</h4>
                      <p className="text-blue-800">{aiAnalysis.recommendation}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Обоснование</h4>
                      <p className="text-sm text-muted-foreground">{aiAnalysis.reasoning}</p>
                    </div>
                    
                    {aiAnalysis.riskAssessment && (
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <h4 className="font-medium text-yellow-900 mb-2">Оценка рисков</h4>
                        <p className="text-yellow-800 text-sm">{aiAnalysis.riskAssessment}</p>
                      </div>
                    )}

                    {/* Сравнение цен */}
                    {aiAnalysis.priceComparison && aiAnalysis.priceComparison.length > 0 && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-3">Сравнение цен</h4>
                        <div className="space-y-2">
                          {aiAnalysis.priceComparison.map((item, index) => (
                            <div key={item.offerId} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Badge variant={index === 0 ? "default" : "outline"} className="text-xs">
                                  {index + 1}
                                </Badge>
                                <span>{item.company}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{formatPrice(item.price)}</span>
                                {item.savings && item.savings > 0 && (
                                  <Badge variant="outline" className="text-red-600">
                                    +{formatPrice(item.savings)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Диалог финализации выбора */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Финализация выбора поставщика</DialogTitle>
            <DialogDescription>
              Подтвердите выбор поставщика для завершения заявки
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Выбранное предложение</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded border">
                {selectedOfferId && request?.commercialOffers && (
                  (() => {
                    const selectedOffer = request.commercialOffers.find(o => o.id === selectedOfferId)
                    return selectedOffer ? (
                      <div>
                        <p className="font-medium">{selectedOffer.company}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(selectedOffer.totalPrice, selectedOffer.currency)}
                        </p>
                      </div>
                    ) : null
                  })()
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="reason">Обоснование выбора</Label>
              <Textarea
                id="reason"
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="Укажите причины выбора данного поставщика..."
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowFinalizeDialog(false)}
                disabled={finalizing}
              >
                Отмена
              </Button>
              <Button 
                onClick={finalizeSelection}
                disabled={finalizing || !selectedOfferId || !decisionReason.trim()}
              >
                {finalizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Завершить заявку
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
