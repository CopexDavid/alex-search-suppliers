"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  MessageSquare,
  Phone,
  Star,
  Download,
  Eye,
  Building2,
  Calendar,
  DollarSign,
  User,
  Bot,
  TrendingUp,
  Award,
} from "lucide-react"

export default function RequestDetailPage() {
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null)

  const requestData = {
    id: "REQ-001",
    title: "Закупка строительных материалов",
    description: "Цемент М400 - 50 тонн, Арматура А500С диаметр 12мм - 5 тонн, Кирпич керамический - 10000 шт",
    category: "Строительные материалы",
    estimatedAmount: 2500000,
    requester: "Иванов И.И.",
    department: "Отдел строительства",
    createdAt: "2024-01-15 09:30",
    deadline: "2024-01-25",
    status: "На согласовании",
    priority: "Высокий",
    currentStep: "Выбор поставщика",
  }

  const processSteps = [
    { step: "Получение заявки из 1С", status: "completed", timestamp: "09:30", duration: "1 мин" },
    { step: "Поиск поставщиков", status: "completed", timestamp: "09:31", duration: "15 мин" },
    { step: "Извлечение контактов", status: "completed", timestamp: "09:46", duration: "5 мин" },
    { step: "Отправка запросов в WhatsApp", status: "completed", timestamp: "09:51", duration: "30 мин" },
    { step: "Сбор коммерческих предложений", status: "completed", timestamp: "10:21", duration: "2 часа" },
    { step: "Анализ и сравнение КП", status: "completed", timestamp: "12:21", duration: "10 мин" },
    { step: "Согласование с инициатором", status: "current", timestamp: "12:31", duration: "В процессе" },
  ]

  const suppliers = [
    {
      id: 1,
      name: "ТОО СтройМатериалы КЗ",
      phone: "+7 777 123 4567",
      contactPerson: "Петров Алексей",
      price: 2350000,
      deliveryTime: "7-10 дней",
      paymentTerms: "Предоплата 30%",
      discount: "5% при заказе свыше 2М",
      rating: 9.2,
      isRecommended: true,
      responseTime: "45 мин",
      messagesCount: 12,
      lastMessage: "Готовы предоставить скидку 5%",
      whatsappStatus: "Активный диалог",
    },
    {
      id: 2,
      name: "ИП Строй Плюс",
      phone: "+7 777 234 5678",
      contactPerson: "Сидорова Мария",
      price: 2680000,
      deliveryTime: "5-7 дней",
      paymentTerms: "Оплата по факту",
      discount: "Без скидок",
      rating: 7.8,
      isRecommended: false,
      responseTime: "1 час 20 мин",
      messagesCount: 8,
      lastMessage: "Можем ускорить доставку",
      whatsappStatus: "Завершен",
    },
    {
      id: 3,
      name: "ООО МегаСтрой",
      phone: "+7 777 345 6789",
      contactPerson: "Козлов Дмитрий",
      price: 2420000,
      deliveryTime: "10-14 дней",
      paymentTerms: "Предоплата 50%",
      discount: "3% при повторном заказе",
      rating: 8.5,
      isRecommended: false,
      responseTime: "2 часа 15 мин",
      messagesCount: 15,
      lastMessage: "Уточняем наличие на складе",
      whatsappStatus: "Ожидание ответа",
    },
  ]

  const whatsappDialogs = {
    1: [
      {
        id: 1,
        sender: "ai",
        content:
          "Добрый день! Меня зовут Александр, представляю компанию TOO Alex. У нас есть заявка на строительные материалы. Можете предоставить коммерческое предложение?",
        timestamp: "09:51",
      },
      {
        id: 2,
        sender: "supplier",
        content: "Здравствуйте! Конечно, можем помочь. Какие именно материалы нужны и в каком объеме?",
        timestamp: "09:55",
      },
      {
        id: 3,
        sender: "ai",
        content:
          "Нам требуется: Цемент М400 - 50 тонн, Арматура А500С диаметр 12мм - 5 тонн, Кирпич керамический - 10000 шт. Срок поставки до 25 января.",
        timestamp: "09:56",
      },
      {
        id: 4,
        sender: "supplier",
        content: "Понятно. Подготовлю КП в течение часа. Есть ли требования по качеству и сертификатам?",
        timestamp: "10:02",
      },
      {
        id: 5,
        sender: "ai",
        content:
          "Да, нужны все сертификаты качества и соответствия ГОСТ. Также интересуют условия оплаты и возможные скидки.",
        timestamp: "10:03",
      },
      {
        id: 6,
        sender: "supplier",
        content:
          "Отлично! Готово КП: Общая сумма 2,470,000 тг. При заказе свыше 2М тг предоставляем скидку 5%. Итого: 2,350,000 тг. Предоплата 30%, доставка 7-10 дней.",
        timestamp: "10:45",
      },
      {
        id: 7,
        sender: "ai",
        content: "Спасибо за быстрый ответ! Очень конкурентное предложение. Передам на рассмотрение руководству.",
        timestamp: "10:46",
      },
    ],
    2: [
      {
        id: 1,
        sender: "ai",
        content: "Добрый день! Александр из TOO Alex. Нужно КП на строительные материалы. Можете помочь?",
        timestamp: "09:52",
      },
      {
        id: 2,
        sender: "supplier",
        content: "Привет! Да, конечно. Что именно нужно?",
        timestamp: "11:12",
      },
      {
        id: 3,
        sender: "ai",
        content: "Цемент М400 - 50т, Арматура А500С 12мм - 5т, Кирпич - 10000шт. До 25 января нужно.",
        timestamp: "11:13",
      },
      {
        id: 4,
        sender: "supplier",
        content: "Цемент есть, с арматурой сложнее - только 3 тонны в наличии. Кирпич есть. Цена 2,680,000 тг.",
        timestamp: "11:25",
      },
      {
        id: 5,
        sender: "ai",
        content: "А когда будет вся арматура? И какие условия оплаты?",
        timestamp: "11:26",
      },
      {
        id: 6,
        sender: "supplier",
        content: "Арматуру довезем через неделю. Можем ускорить доставку за доплату. Оплата по факту поставки.",
        timestamp: "11:40",
      },
    ],
    3: [
      {
        id: 1,
        sender: "ai",
        content: "Здравствуйте! Александр, TOO Alex. Нужно КП на стройматериалы. Работаете с корпоративными клиентами?",
        timestamp: "09:53",
      },
      {
        id: 2,
        sender: "supplier",
        content: "Добро пожаловать! Да, работаем. Отправьте спецификацию, подготовим предложение.",
        timestamp: "12:08",
      },
      {
        id: 3,
        sender: "ai",
        content:
          "Спецификация: Цемент М400 - 50 тонн, Арматура А500С диаметр 12мм - 5 тонн, Кирпич керамический - 10000 шт. Срок до 25.01.",
        timestamp: "12:09",
      },
      {
        id: 4,
        sender: "supplier",
        content: "Принято. Уточняем наличие на складе и подготовим КП. Ответим в течение 2-3 часов.",
        timestamp: "12:15",
      },
      {
        id: 5,
        sender: "ai",
        content: "Хорошо, ждем. Есть ли у вас скидки для постоянных клиентов?",
        timestamp: "12:16",
      },
      {
        id: 6,
        sender: "supplier",
        content:
          "Да, для постоянных клиентов 3% скидка. КП готово: 2,420,000 тг с учетом скидки. Предоплата 50%, доставка 10-14 дней.",
        timestamp: "14:30",
      },
    ],
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "current":
        return <Clock className="h-4 w-4 text-blue-600" />
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ru-RU").format(price) + " тг"
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к заявкам
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{requestData.title}</h1>
            <p className="text-muted-foreground">
              {requestData.id} • {requestData.category} • {formatPrice(requestData.estimatedAmount)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{requestData.priority} приоритет</Badge>
          <Badge variant="default">{requestData.status}</Badge>
        </div>
      </div>

      {/* Основная информация */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Детали заявки</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Инициатор:</span>
                <p className="font-medium">{requestData.requester}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Отдел:</span>
                <p className="font-medium">{requestData.department}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Создана:</span>
                <p className="font-medium">{requestData.createdAt}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Срок выполнения:</span>
                <p className="font-medium">{requestData.deadline}</p>
              </div>
            </div>
            <Separator />
            <div>
              <span className="text-sm text-muted-foreground">Описание:</span>
              <p className="mt-1">{requestData.description}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Прогресс обработки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processSteps.map((step, index) => (
                <div key={index} className="flex items-center space-x-3">
                  {getStatusIcon(step.status)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{step.step}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>{step.timestamp}</span>
                      <span>•</span>
                      <span>{step.duration}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Табы с результатами */}
      <Tabs defaultValue="comparison" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comparison">Сравнение поставщиков</TabsTrigger>
          <TabsTrigger value="dialogs">Диалоги WhatsApp</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика поиска</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Сравнительная таблица поставщиков
              </CardTitle>
              <CardDescription>Получено 3 коммерческих предложения. Рекомендуется лучший вариант.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      supplier.isRecommended
                        ? "border-green-200 bg-green-50/50 shadow-md"
                        : "border-border bg-background"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-semibold">{supplier.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {supplier.contactPerson} • {supplier.phone}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {supplier.isRecommended && (
                          <Badge variant="default" className="bg-green-600">
                            <Award className="mr-1 h-3 w-3" />
                            Рекомендуется
                          </Badge>
                        )}
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium">{supplier.rating}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Цена</p>
                          <p className="text-sm font-medium">{formatPrice(supplier.price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Срок доставки</p>
                          <p className="text-sm font-medium">{supplier.deliveryTime}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-purple-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Время ответа</p>
                          <p className="text-sm font-medium">{supplier.responseTime}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4 text-orange-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Сообщений</p>
                          <p className="text-sm font-medium">{supplier.messagesCount}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Условия оплаты:</span>
                        <p className="font-medium">{supplier.paymentTerms}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Скидки:</span>
                        <p className="font-medium">{supplier.discount}</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-muted-foreground">WhatsApp статус:</span>
                        <span className="ml-2 font-medium">{supplier.whatsappStatus}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSupplier(supplier.id)}
                        className="bg-transparent"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Посмотреть диалог
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex space-x-2">
                <Button>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Согласовать рекомендуемого
                </Button>
                <Button variant="outline" className="bg-transparent">
                  <Download className="mr-2 h-4 w-4" />
                  Скачать сравнение
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dialogs" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier) => (
              <Card key={supplier.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{supplier.name}</CardTitle>
                    {supplier.isRecommended && <Badge variant="default">Рекомендуется</Badge>}
                  </div>
                  <CardDescription>
                    {supplier.messagesCount} сообщений • {supplier.responseTime}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{supplier.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{supplier.contactPerson}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Последнее сообщение: "{supplier.lastMessage}"</div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full mt-4 bg-transparent">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Открыть диалог
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Диалог WhatsApp с {supplier.name}</DialogTitle>
                        <DialogDescription>
                          Переписка с {supplier.contactPerson} • {supplier.phone}
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-4">
                          {whatsappDialogs[supplier.id as keyof typeof whatsappDialogs]?.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.sender === "supplier" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`flex items-start space-x-2 max-w-[80%] ${
                                  message.sender === "supplier" ? "flex-row-reverse space-x-reverse" : ""
                                }`}
                              >
                                <Avatar className="h-8 w-8">
                                  {message.sender === "ai" ? (
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                      <Bot className="h-4 w-4" />
                                    </AvatarFallback>
                                  ) : (
                                    <AvatarFallback className="bg-secondary">
                                      <User className="h-4 w-4" />
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div
                                  className={`rounded-lg p-3 ${
                                    message.sender === "supplier"
                                      ? "bg-green-100 text-green-900"
                                      : "bg-blue-100 text-blue-900"
                                  }`}
                                >
                                  <p className="text-sm">{message.content}</p>
                                  <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Найдено компаний</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">47</div>
                <p className="text-xs text-muted-foreground">По поисковому запросу</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Извлечено контактов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23</div>
                <p className="text-xs text-muted-foreground">WhatsApp номеров</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Отправлено запросов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23</div>
                <p className="text-xs text-muted-foreground">В WhatsApp</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Получено КП</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">Коммерческих предложений</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Детальная аналитика поиска</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Результаты поиска:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Всего найдено компаний:</span>
                        <span className="font-medium">47</span>
                      </div>
                      <div className="flex justify-between">
                        <span>С контактными данными:</span>
                        <span className="font-medium">23 (49%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>С WhatsApp:</span>
                        <span className="font-medium">23 (100%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ответили на запрос:</span>
                        <span className="font-medium">3 (13%)</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Время обработки:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Поиск компаний:</span>
                        <span className="font-medium">15 минут</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Извлечение контактов:</span>
                        <span className="font-medium">5 минут</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Отправка запросов:</span>
                        <span className="font-medium">30 минут</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Сбор ответов:</span>
                        <span className="font-medium">2 часа</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
