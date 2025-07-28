"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
} from "lucide-react"

export default function AIAnalysisPage() {
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [skipAlternatives, setSkipAlternatives] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)

  const requestData = {
    id: "REQ-001",
    category: "Канцелярские товары",
    description: "Бумага А4, ручки, папки",
    estimatedAmount: 45000,
    requester: "Отдел закупок",
    isTypical: true,
  }

  const preferredSuppliers = [
    { id: 1, name: "ТОО Канцтовары Плюс", hasContract: true, lastOrder: "2024-01-10" },
    { id: 2, name: "ИП Офис Снаб", hasContract: true, lastOrder: "2023-12-15" },
    { id: 3, name: "ООО Бизнес Центр", hasContract: false, lastOrder: "2023-11-20" },
  ]

  const aiLogs = [
    {
      id: 1,
      timestamp: "14:32:15",
      action: "Анализ заявки REQ-001",
      status: "completed",
      details: "Категория: Канцелярские товары, Сумма: 45,000 тг",
    },
    {
      id: 2,
      timestamp: "14:32:18",
      action: "Проверка типовости закупки",
      status: "completed",
      details: "Найдено 8 аналогичных заказов за последние 6 месяцев",
    },
    {
      id: 3,
      timestamp: "14:32:22",
      action: skipAlternatives ? "Прямая отправка поставщику" : "Поиск альтернативных поставщиков",
      status: isProcessing ? "processing" : "completed",
      details: skipAlternatives
        ? `Отправлено: ${selectedSupplier || "ТОО Канцтовары Плюс"}`
        : "Найдено 3 подходящих поставщика",
    },
    {
      id: 4,
      timestamp: "14:32:25",
      action: "Фиксация данных в системе",
      status: analysisComplete ? "completed" : "processing",
      details: "Сохранение в реестр закупок и аналитику",
    },
  ]

  const supplierComparison = [
    {
      name: "ТОО Канцтовары Плюс",
      price: 45000,
      deliveryTime: "2-3 дня",
      paymentTerms: "Отсрочка 14 дней",
      reliability: "Высокая",
      lastOrders: 12,
      avgDelay: "0 дней",
      hasContract: true,
    },
    {
      name: "ИП Офис Снаб",
      price: 47500,
      deliveryTime: "1-2 дня",
      paymentTerms: "Предоплата 50%",
      reliability: "Средняя",
      lastOrders: 5,
      avgDelay: "1 день",
      hasContract: true,
    },
    {
      name: "ООО Бизнес Центр",
      price: 43000,
      deliveryTime: "3-5 дней",
      paymentTerms: "Оплата по факту",
      reliability: "Средняя",
      lastOrders: 2,
      avgDelay: "2 дня",
      hasContract: false,
    },
  ]

  useEffect(() => {
    if (isProcessing) {
      const timer = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 100) {
            setAnalysisComplete(true)
            setIsProcessing(false)
            clearInterval(timer)
            return 100
          }
          return prev + 5
        })
      }, 300)
      return () => clearInterval(timer)
    }
  }, [isProcessing])

  const handleStartAnalysis = () => {
    setIsProcessing(true)
    setAnalysisProgress(0)
    setAnalysisComplete(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Brain className="mr-3 h-8 w-8 text-primary" />
            Обработка заявки
          </h1>
          <p className="text-muted-foreground mt-1">
            {requestData.id} • {requestData.category} • {requestData.estimatedAmount.toLocaleString()} тг
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {requestData.isTypical && (
            <Badge variant="outline">
              <Package className="mr-1 h-3 w-3" />
              Типовая закупка
            </Badge>
          )}
          {analysisComplete ? (
            <Badge variant="default">
              <CheckCircle className="mr-1 h-3 w-3" />
              Обработано
            </Badge>
          ) : isProcessing ? (
            <Badge variant="secondary">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Обработка
            </Badge>
          ) : (
            <Badge variant="outline">Ожидание</Badge>
          )}
        </div>
      </div>

      {/* Настройки обработки */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Параметры обработки</CardTitle>
          <CardDescription>Настройте способ обработки заявки</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="skip-alternatives" checked={skipAlternatives} onCheckedChange={setSkipAlternatives} />
            <Label htmlFor="skip-alternatives" className="text-sm">
              Не искать альтернативы (отправить проверенному поставщику)
            </Label>
          </div>

          {skipAlternatives && (
            <div className="ml-6 space-y-3 p-4 bg-slate-50 rounded-lg">
              <Label className="text-sm font-medium">Выберите поставщика:</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите поставщика" />
                </SelectTrigger>
                <SelectContent>
                  {preferredSuppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{supplier.name}</span>
                        <div className="flex items-center space-x-2 ml-4">
                          {supplier.hasContract && (
                            <Badge variant="outline" className="text-xs">
                              Договор
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{supplier.lastOrder}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">ИИ зафиксирует все данные о закупке для аналитики</p>
            </div>
          )}

          <div className="flex space-x-2">
            <Button onClick={handleStartAnalysis} disabled={isProcessing || (skipAlternatives && !selectedSupplier)}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Обработка...
                </>
              ) : (
                "Начать обработку"
              )}
            </Button>
            {analysisComplete && (
              <Button variant="outline" className="bg-transparent">
                <Download className="mr-2 h-4 w-4" />
                Экспорт данных
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Прогресс обработки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Обработка заявки</span>
                <span className="text-sm text-muted-foreground">{analysisProgress}%</span>
              </div>
              <Progress value={analysisProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Логи системы */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Журнал обработки
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              <div className="p-4 space-y-3">
                {aiLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-3">
                    {getStatusIcon(log.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium">{log.action}</p>
                        <span className="text-xs text-muted-foreground">{log.timestamp}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Результат обработки */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">{skipAlternatives ? "Прямая отправка" : "Сравнение поставщиков"}</CardTitle>
            <CardDescription>
              {skipAlternatives ? "Заявка отправлена выбранному поставщику" : "Результаты анализа предложений"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {skipAlternatives ? (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">{selectedSupplier || "ТОО Канцтовары Плюс"}</h3>
                    <Badge variant="outline">Выбран</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Статус договора:</span>
                      <p className="font-medium">Действующий</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Последний заказ:</span>
                      <p className="font-medium">10.01.2024</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Средний срок:</span>
                      <p className="font-medium">2-3 дня</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Надежность:</span>
                      <p className="font-medium">Высокая</p>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground p-3 bg-slate-50 rounded">
                  <p className="font-medium mb-1">Данные сохранены в системе:</p>
                  <ul className="space-y-1">
                    <li>• Дата и время заказа</li>
                    <li>• Поставщик и условия</li>
                    <li>• Сумма и спецификация</li>
                    <li>• Ответственный сотрудник</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {supplierComparison.map((supplier, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{supplier.name}</h3>
                      <div className="flex items-center space-x-2">
                        {supplier.hasContract && (
                          <Badge variant="outline" className="text-xs">
                            Договор
                          </Badge>
                        )}
                        {index === 0 && (
                          <Badge variant="default" className="text-xs">
                            Рекомендуется
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Цена:</span>
                        <p className="font-medium">{supplier.price.toLocaleString()} тг</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Срок:</span>
                        <p className="font-medium">{supplier.deliveryTime}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Заказов:</span>
                        <p className="font-medium">{supplier.lastOrders}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Задержки:</span>
                        <p className="font-medium">{supplier.avgDelay}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Аналитика и отчеты */}
      {analysisComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Данные для аналитики
            </CardTitle>
            <CardDescription>Информация сохранена в реестр закупок</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-muted-foreground">Дата обработки</p>
                  <p className="font-medium">15.01.2024 14:32</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-muted-foreground">Сумма</p>
                  <p className="font-medium">{requestData.estimatedAmount.toLocaleString()} тг</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-muted-foreground">Поставщик</p>
                  <p className="font-medium">{skipAlternatives ? selectedSupplier : "ТОО Канцтовары Плюс"}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-muted-foreground">Ожидаемая доставка</p>
                  <p className="font-medium">17.01.2024</p>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex space-x-2">
              <Button variant="outline" className="bg-transparent">
                <FileText className="mr-2 h-4 w-4" />
                Сформировать заказ
              </Button>
              <Button variant="outline" className="bg-transparent">
                <Download className="mr-2 h-4 w-4" />
                Экспорт в Excel
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-transparent">
                    <Database className="mr-2 h-4 w-4" />
                    Просмотр аналитики
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Аналитика закупок</DialogTitle>
                    <DialogDescription>Статистика по категории "{requestData.category}"</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold">24</div>
                        <div className="text-sm text-muted-foreground">Заказов за год</div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold">1.2М</div>
                        <div className="text-sm text-muted-foreground">Общая сумма (тг)</div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold">2.1</div>
                        <div className="text-sm text-muted-foreground">Средний срок (дни)</div>
                      </div>
                    </div>
                    <div className="text-sm">
                      <h4 className="font-medium mb-2">Топ поставщиков по категории:</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>ТОО Канцтовары Плюс</span>
                          <span className="text-muted-foreground">15 заказов</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ИП Офис Снаб</span>
                          <span className="text-muted-foreground">6 заказов</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ООО Бизнес Центр</span>
                          <span className="text-muted-foreground">3 заказа</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
