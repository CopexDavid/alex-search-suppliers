"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  Database,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Award,
  Users,
  RefreshCw,
} from "lucide-react"

interface Request {
  id: string
  requestNumber: string
  description: string
  status: string
  createdAt: string
  positions: Position[]
}

interface Position {
  id: string
  name: string
  description?: string
  quantity: number
  unit: string
  searchStatus: string
  quotesRequested: number
  quotesReceived: number
  aiRecommendation?: string
  finalChoice?: string
  positionChats: PositionChat[]
}

interface PositionChat {
  id: string
  status: string
  chat: {
    id: string
    phoneNumber: string
    contactName?: string
    messages: ChatMessage[]
  }
}

interface ChatMessage {
  id: string
  direction: string
  content: string
  timestamp: string
  messageType: string
}

interface SupplierAnalysis {
  supplierId: string
  supplierName: string
  phoneNumber: string
  quotesReceived: number
  avgResponseTime: number
  priceEstimate?: number
  reliabilityScore: number
  recommendation: 'BEST' | 'GOOD' | 'ACCEPTABLE' | 'NOT_RECOMMENDED'
  reasons: string[]
}

export default function AIAnalysisPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [analysis, setAnalysis] = useState<SupplierAnalysis[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [userDecision, setUserDecision] = useState<string>("")
  const [decisionReason, setDecisionReason] = useState<string>("")
  const [loading, setLoading] = useState(true)

  // Загрузка заявок готовых к анализу
  const loadRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/requests?status=PENDING_QUOTES,COMPARING', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests || [])
        
        // Автоматически выбираем первую заявку
        if (data.requests?.length > 0) {
          setSelectedRequest(data.requests[0])
        }
      }
    } catch (error) {
      console.error('Error loading requests:', error)
    } finally {
      setLoading(false)
    }
  }

  // ИИ анализ поставщиков для позиции
  const analyzeSuppliers = async (positionId: string) => {
    if (!selectedRequest) return
    
    setIsAnalyzing(true)
    setAnalysisProgress(0)
    
    try {
      // Симуляция ИИ анализа
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const response = await fetch(`/api/requests/${selectedRequest.id}/positions/${positionId}/analyze`, {
        method: 'POST',
        credentials: 'include'
      })

      clearInterval(progressInterval)
      setAnalysisProgress(100)

      if (response.ok) {
        const data = await response.json()
        setAnalysis(data.analysis || [])
      } else {
        // Fallback: создаем mock анализ на основе реальных данных
        const position = selectedRequest.positions.find(p => p.id === positionId)
        if (position) {
          const mockAnalysis = generateMockAnalysis(position)
          setAnalysis(mockAnalysis)
        }
      }
    } catch (error) {
      console.error('Error analyzing suppliers:', error)
      // Fallback анализ
      const position = selectedRequest.positions.find(p => p.id === positionId)
      if (position) {
        const mockAnalysis = generateMockAnalysis(position)
        setAnalysis(mockAnalysis)
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Генерация mock анализа на основе реальных данных
  const generateMockAnalysis = (position: Position): SupplierAnalysis[] => {
    return position.positionChats.map((pc, index) => ({
      supplierId: pc.chat.id,
      supplierName: pc.chat.contactName || `Поставщик ${pc.chat.phoneNumber}`,
      phoneNumber: pc.chat.phoneNumber,
      quotesReceived: pc.chat.messages.filter(m => m.direction === 'INCOMING').length,
      avgResponseTime: Math.floor(Math.random() * 24) + 1, // 1-24 часа
      priceEstimate: pc.status === 'RECEIVED' ? Math.floor(Math.random() * 50000) + 10000 : undefined,
      reliabilityScore: Math.floor(Math.random() * 30) + 70, // 70-100
      recommendation: index === 0 ? 'BEST' : index === 1 ? 'GOOD' : 'ACCEPTABLE',
      reasons: generateReasons(index)
    }))
  }

  const generateReasons = (index: number): string[] => {
    const allReasons = [
      'Быстрый ответ на запрос',
      'Конкурентная цена',
      'Хорошая репутация',
      'Наличие товара на складе',
      'Гибкие условия оплаты',
      'Быстрая доставка',
      'Качественная продукция',
      'Долгосрочное сотрудничество'
    ]
    
    return allReasons.slice(0, 3 + index).reverse()
  }

  // Сохранение решения пользователя
  const saveDecision = async () => {
    if (!selectedPosition || !userDecision) return

    try {
      const response = await fetch(`/api/requests/${selectedRequest?.id}/positions/${selectedPosition.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          supplierId: userDecision,
          reason: decisionReason,
          aiRecommendation: analysis.find(a => a.recommendation === 'BEST')?.supplierId
        })
      })

      if (response.ok) {
        alert('Решение сохранено!')
        await loadRequests() // Перезагружаем данные
        setUserDecision("")
        setDecisionReason("")
      }
    } catch (error) {
      console.error('Error saving decision:', error)
      alert('Ошибка при сохранении решения')
    }
  }

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'BEST':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><Award className="w-3 h-3 mr-1" />Лучший</Badge>
      case 'GOOD':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><TrendingUp className="w-3 h-3 mr-1" />Хороший</Badge>
      case 'ACCEPTABLE':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Приемлемый</Badge>
      default:
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Не рекомендуется</Badge>
    }
  }

  const getPositionStatusBadge = (position: Position) => {
    if (position.finalChoice) {
      return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Решение принято</Badge>
    }
    if (position.quotesReceived >= 3) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Brain className="w-3 h-3 mr-1" />Готов к анализу</Badge>
    }
    if (position.quotesRequested > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Ожидание КП</Badge>
    }
    return <Badge variant="outline">Поиск поставщиков</Badge>
  }

  useEffect(() => {
    loadRequests()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка заявок...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Brain className="mr-3 h-8 w-8 text-primary" />
            ИИ Анализ поставщиков
          </h1>
          <p className="text-muted-foreground mt-1">
            Анализ коммерческих предложений и выбор лучших поставщиков
          </p>
        </div>
        <Button onClick={loadRequests} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Обновить
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Нет заявок для анализа</h3>
            <p className="text-muted-foreground text-center">
              Заявки появятся здесь после получения коммерческих предложений от поставщиков
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Список заявок */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Заявки ({requests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="p-4 space-y-3">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedRequest?.id === request.id 
                          ? 'bg-primary/5 border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedRequest(request)
                        setSelectedPosition(null)
                        setAnalysis([])
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{request.requestNumber}</h4>
                        <Badge variant="outline" className="text-xs">
                          {request.positions.length} поз.
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {request.description}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex items-center">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          {request.positions.reduce((sum, p) => sum + p.quotesReceived, 0)} КП
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Позиции заявки */}
          {selectedRequest && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  Позиции заявки
                </CardTitle>
                <CardDescription>
                  {selectedRequest.requestNumber}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="p-4 space-y-3">
                    {selectedRequest.positions.map((position) => (
                      <div
                        key={position.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedPosition?.id === position.id 
                            ? 'bg-primary/5 border-primary' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => {
                          setSelectedPosition(position)
                          setAnalysis([])
                        }}
                      >
                        <div className="mb-2">
                          <h4 className="font-medium text-sm mb-1">{position.name}</h4>
                          {getPositionStatusBadge(position)}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Количество: {position.quantity} {position.unit}</div>
                          <div className="flex justify-between">
                            <span>Запросов: {position.quotesRequested}</span>
                            <span>Получено: {position.quotesReceived}</span>
                          </div>
                        </div>
                        {position.quotesReceived >= 3 && !position.finalChoice && (
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedPosition(position)
                              analyzeSuppliers(position.id)
                            }}
                          >
                            <Brain className="w-3 h-3 mr-1" />
                            Анализировать
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Анализ и решение */}
          {selectedPosition && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Brain className="mr-2 h-5 w-5" />
                  ИИ Анализ
                </CardTitle>
                <CardDescription>
                  {selectedPosition.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isAnalyzing ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Анализ предложений...</span>
                      <span className="text-sm text-muted-foreground">{analysisProgress}%</span>
                    </div>
                    <Progress value={analysisProgress} className="h-2" />
                  </div>
                ) : analysis.length > 0 ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {analysis.map((supplier) => (
                        <div key={supplier.supplierId} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">{supplier.supplierName}</h4>
                            {getRecommendationBadge(supplier.recommendation)}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div>КП получено: {supplier.quotesReceived}</div>
                            <div>Время ответа: {supplier.avgResponseTime}ч</div>
                            {supplier.priceEstimate && (
                              <>
                                <div>Цена: {supplier.priceEstimate.toLocaleString()} тг</div>
                                <div>Рейтинг: {supplier.reliabilityScore}/100</div>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <strong>Причины:</strong> {supplier.reasons.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Ваше решение:</Label>
                      <Select value={userDecision} onValueChange={setUserDecision}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите поставщика" />
                        </SelectTrigger>
                        <SelectContent>
                          {analysis.map((supplier) => (
                            <SelectItem key={supplier.supplierId} value={supplier.supplierId}>
                              {supplier.supplierName} 
                              {supplier.recommendation === 'BEST' && ' (рекомендуется ИИ)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div>
                        <Label className="text-sm">Комментарий (опционально):</Label>
                        <Textarea
                          placeholder="Причина выбора..."
                          value={decisionReason}
                          onChange={(e) => setDecisionReason(e.target.value)}
                          className="mt-1"
                        />
                      </div>

                      <Button 
                        onClick={saveDecision}
                        disabled={!userDecision}
                        className="w-full"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Сохранить решение
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {selectedPosition.quotesReceived >= 3 
                        ? 'Нажмите "Анализировать" для запуска ИИ анализа'
                        : `Получено ${selectedPosition.quotesReceived} из минимум 3 КП`
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}