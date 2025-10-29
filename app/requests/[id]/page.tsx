"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowLeft,
  Calendar,
  User,
  FileText,
  Package,
  DollarSign,
  AlertCircle,
  Loader2,
  Edit,
  Trash2,
  Search,
  Building2,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  Star,
  CheckCircle,
  Clock,
} from "lucide-react"
import Link from "next/link"
import { RequestEditDialog } from "@/components/request-edit-dialog"

interface Position {
  id: string
  name: string
  description: string
  quantity: number
  unit: string
  price?: number
  totalPrice?: number
}

interface Supplier {
  id: string
  name: string
  website?: string
  phone?: string
  whatsapp?: string
  email?: string
  address?: string
  description?: string
  rating: number
  tags: string[]
}

interface RequestSupplier {
  id: string
  status: string
  foundVia?: string
  requestSent: boolean
  responseReceived: boolean
  supplier: Supplier
}

interface Request {
  id: string
  requestNumber: string
  description: string
  deadline: string
  budget: number | null
  currency: string
  priority: number
  status: string
  originalFile: string | null
  createdAt: string
  updatedAt: string
  positions: Position[]
  suppliers: RequestSupplier[]
  creator: {
    id: string
    name: string
    email: string
  }
}

export default function RequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchProgress, setSearchProgress] = useState("")
  const [searchingPositions, setSearchingPositions] = useState<Record<string, boolean>>({}) // Отслеживаем поиск по каждой позиции

  useEffect(() => {
    loadRequest()
  }, [requestId])

  useEffect(() => {
    // Автоматический запуск поиска при загрузке заявки без поставщиков
    if (request && request.suppliers.length === 0 && request.status === "UPLOADED") {
      handleAutoSearch()
    }
  }, [request?.id])

  const loadRequest = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 404) {
          setError("Заявка не найдена")
        } else {
          setError("Ошибка загрузки заявки")
        }
        setLoading(false)
        return
      }

      const data = await response.json()
      setRequest(data.data)
    } catch (err) {
      console.error("Load request error:", err)
      setError("Не удалось загрузить заявку")
    } finally {
      setLoading(false)
    }
  }

  const handleAutoSearch = async () => {
    if (!request) return
    
    setSearching(true)
    setSearchProgress("Запуск автоматического поиска...")

    try {
      const response = await fetch(`/api/requests/${requestId}/search`, {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Ошибка при поиске")
      }

      const data = await response.json()
      setSearchProgress(`Найдено ${data.data.suppliersFound} поставщиков!`)
      
      // Обновляем данные заявки
      setTimeout(() => {
        loadRequest()
        setSearching(false)
        setSearchProgress("")
      }, 2000)
    } catch (err: any) {
      console.error("Search error:", err)
      setSearchProgress("")
      setSearching(false)
      alert(err.message || "Ошибка при поиске поставщиков")
    }
  }

  // Поиск по конкретной позиции
  const handleSearchForPosition = async (positionId: string, positionName: string) => {
    if (!request) return
    
    setSearchingPositions(prev => ({ ...prev, [positionId]: true }))

    try {
      const response = await fetch(`/api/requests/${requestId}/positions/${positionId}/search`, {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Ошибка при поиске")
      }

      const data = await response.json()
      alert(`Найдено ${data.data.suppliersFound} поставщиков для позиции "${positionName}"!`)
      
      // Обновляем данные заявки
      await loadRequest()
    } catch (err: any) {
      console.error("Search error:", err)
      alert(err.message || "Ошибка при поиске поставщиков")
    } finally {
      setSearchingPositions(prev => ({ ...prev, [positionId]: false }))
    }
  }

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите архивировать эту заявку?")) {
      return
    }

    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        router.push("/requests")
      } else {
        alert("Ошибка при удалении заявки")
      }
    } catch (err) {
      console.error("Delete error:", err)
      alert("Ошибка соединения с сервером")
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      UPLOADED: { label: "Новая", variant: "default" },
      SEARCHING: { label: "Поиск поставщиков", variant: "secondary" },
      PENDING_QUOTES: { label: "Ожидание КП", variant: "secondary" },
      COMPARING: { label: "Сравнение предложений", variant: "secondary" },
      APPROVED: { label: "Согласована", variant: "outline" },
      REJECTED: { label: "Отклонена", variant: "destructive" },
      COMPLETED: { label: "Завершена", variant: "outline" },
      ARCHIVED: { label: "Архив", variant: "outline" },
    }

    const statusInfo = statusMap[status] || { label: status, variant: "default" as const }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  const getPriorityBadge = (priority: number) => {
    const priorities = [
      { label: "Низкий", variant: "outline" as const, color: "text-gray-600" },
      { label: "Средний", variant: "secondary" as const, color: "text-blue-600" },
      { label: "Высокий", variant: "destructive" as const, color: "text-red-600" },
    ]
    const priorityInfo = priorities[priority] || priorities[1]
    return <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>
  }

  const getSupplierStatusBadge = (supplierStatus: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      PENDING: { label: "Ожидание", variant: "outline" },
      SENT: { label: "Отправлено", variant: "secondary" },
      RESPONDED: { label: "Получен ответ", variant: "default" },
      REJECTED: { label: "Отклонено", variant: "destructive" },
    }
    const info = statusMap[supplierStatus] || statusMap.PENDING
    return <Badge variant={info.variant}>{info.label}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const calculateTotal = () => {
    if (!request) return 0
    return request.positions.reduce((sum, pos) => {
      if (pos.price) {
        return sum + pos.price * pos.quantity
      }
      return sum
    }, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Загрузка заявки...</span>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="max-w-2xl mx-auto mt-20">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertCircle className="mr-2 h-5 w-5" />
              Ошибка
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error || "Заявка не найдена"}</p>
            <Link href="/requests">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Вернуться к списку
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/requests">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Заявка {request.requestNumber}</h1>
            <p className="text-muted-foreground">
              Создана {formatDateTime(request.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(request.status)}
          {getPriorityBadge(request.priority)}
        </div>
      </div>

      {/* Автопоиск в процессе */}
      {searching && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            {searchProgress || "Идет поиск поставщиков..."}
          </AlertDescription>
        </Alert>
      )}

      {/* Основная информация */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Основная информация
            </span>
            <div className="flex space-x-2">
              <RequestEditDialog requestId={request.id} initialData={request} />
              <Button variant="outline" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Архивировать
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center text-sm text-muted-foreground mb-1">
                <FileText className="h-4 w-4 mr-1" />
                Номер заявки
              </div>
              <div className="font-medium">{request.requestNumber}</div>
            </div>

            <div>
              <div className="flex items-center text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4 mr-1" />
                Срок выполнения
              </div>
              <div className="font-medium">{formatDate(request.deadline)}</div>
            </div>

            <div>
              <div className="flex items-center text-sm text-muted-foreground mb-1">
                <User className="h-4 w-4 mr-1" />
                Создатель
              </div>
              <div className="font-medium">{request.creator.name}</div>
              <div className="text-xs text-muted-foreground">{request.creator.email}</div>
            </div>

            <div>
              <div className="flex items-center text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4 mr-1" />
                Валюта
              </div>
              <div className="font-medium">{request.currency}</div>
            </div>

            {request.budget && (
              <div>
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Бюджет
                </div>
                <div className="font-medium">
                  {request.budget.toLocaleString("ru-RU")} {request.currency}
                </div>
              </div>
            )}

            {request.originalFile && (
              <div>
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <FileText className="h-4 w-4 mr-1" />
                  Исходный файл
                </div>
                <div className="font-medium text-sm truncate">{request.originalFile}</div>
              </div>
            )}
          </div>

          {request.description && (
            <>
              <Separator className="my-4" />
              <div>
                <div className="text-sm text-muted-foreground mb-2">Описание</div>
                <div className="text-sm">{request.description}</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Позиции */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Позиции заявки
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({request.positions.length} шт)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">№</TableHead>
                <TableHead>Наименование</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead className="text-right">Количество</TableHead>
                <TableHead>Ед. изм.</TableHead>
                <TableHead className="text-right">Цена</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {request.positions.map((position, index) => (
                <TableRow key={position.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">{position.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs">
                    {position.description || "—"}
                  </TableCell>
                  <TableCell className="text-right">{position.quantity}</TableCell>
                  <TableCell>{position.unit}</TableCell>
                  <TableCell className="text-right">
                    {position.price 
                      ? `${position.price.toLocaleString("ru-RU")} ${request.currency}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {position.price
                      ? `${(position.price * position.quantity).toLocaleString("ru-RU")} ${request.currency}`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {calculateTotal() > 0 && (
                <TableRow className="font-bold">
                  <TableCell colSpan={6} className="text-right">
                    Итого:
                  </TableCell>
                  <TableCell className="text-right">
                    {calculateTotal().toLocaleString("ru-RU")} {request.currency}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {request.positions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Позиции не добавлены</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Поставщики с вкладками по позициям */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              Найденные поставщики
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({request.suppliers.length})
              </span>
            </CardTitle>
            {request.positions.length > 0 && (
              <Button 
                onClick={handleAutoSearch} 
                disabled={searching}
                size="sm"
              >
                {searching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Поиск...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    {request.suppliers.length > 0 ? "Обновить поиск" : "Найти поставщиков"}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {request.suppliers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">Поставщики не найдены</p>
              <p className="text-sm mb-4">
                Нажмите кнопку "Найти поставщиков" для автоматического поиска
              </p>
              {searching && (
                <div className="mt-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="text-sm mt-2">{searchProgress}</p>
                </div>
              )}
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-4 flex-wrap h-auto">
                <TabsTrigger value="all" className="flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Все поставщики
                  <Badge variant="secondary" className="ml-2">
                    {request.suppliers.length}
                  </Badge>
                </TabsTrigger>
                {request.positions.map((position, index) => (
                  <TabsTrigger key={position.id} value={position.id} className="flex items-center">
                    <Package className="h-4 w-4 mr-2" />
                    {position.name.length > 20 
                      ? `${position.name.substring(0, 20)}...` 
                      : position.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Все поставщики */}
              <TabsContent value="all">
                <div className="space-y-4">
                  {request.suppliers.map((rs) => (
                    <div
                      key={rs.id}
                      className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start space-x-3 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              <Building2 className="h-6 w-6" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{rs.supplier.name}</h3>
                            {rs.supplier.description && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {rs.supplier.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2 mb-2">
                              {getSupplierStatusBadge(rs.status)}
                              {rs.foundVia && (
                                <Badge variant="outline" className="text-xs">
                                  {rs.foundVia === "auto-search" ? "Авто-поиск" : rs.foundVia}
                                </Badge>
                              )}
                              {rs.supplier.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {rs.supplier.rating > 0 && (
                            <div className="flex items-center text-yellow-600">
                              <Star className="h-4 w-4 fill-current mr-1" />
                              <span className="font-medium">{rs.supplier.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                        {rs.supplier.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="text-xs text-muted-foreground">Телефон</p>
                              <p className="text-sm font-medium">{rs.supplier.phone}</p>
                            </div>
                          </div>
                        )}
                        {rs.supplier.whatsapp && (
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-xs text-muted-foreground">WhatsApp</p>
                              <a
                                href={`https://wa.me/${rs.supplier.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-green-600 hover:underline"
                              >
                                {rs.supplier.whatsapp}
                              </a>
                            </div>
                          </div>
                        )}
                        {rs.supplier.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-purple-600" />
                            <div>
                              <p className="text-xs text-muted-foreground">Email</p>
                              <p className="text-sm font-medium">{rs.supplier.email}</p>
                            </div>
                          </div>
                        )}
                        {rs.supplier.website && (
                          <div className="flex items-center space-x-2">
                            <Globe className="h-4 w-4 text-gray-600" />
                            <div>
                              <p className="text-xs text-muted-foreground">Сайт</p>
                              <a
                                href={rs.supplier.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium hover:underline truncate max-w-[200px] block"
                              >
                                {new URL(rs.supplier.website).hostname}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="text-sm text-muted-foreground">
                          {rs.requestSent && (
                            <span className="flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                              Запрос отправлен
                            </span>
                          )}
                          {!rs.requestSent && (
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Ожидает отправки
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {rs.supplier.whatsapp && (
                            <Button size="sm" variant="outline">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Отправить запрос
                            </Button>
                          )}
                          {rs.supplier.website && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={rs.supplier.website} target="_blank" rel="noopener noreferrer">
                                <Globe className="h-4 w-4 mr-2" />
                                Сайт
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Вкладки для каждой позиции */}
              {request.positions.map((position) => (
                <TabsContent key={position.id} value={position.id}>
                  <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-1">{position.name}</h4>
                        {position.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {position.description}
                          </p>
                        )}
                        <div className="flex gap-2 text-sm">
                          <Badge variant="outline">
                            {position.quantity} {position.unit}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleSearchForPosition(position.id, position.name)}
                        disabled={searchingPositions[position.id]}
                        size="sm"
                      >
                        {searchingPositions[position.id] ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Поиск...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4" />
                            Найти поставщиков
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(() => {
                      // Фильтруем поставщиков для конкретной позиции
                      const positionSuppliers = request.suppliers.filter(rs => 
                        rs.foundVia?.includes(`auto-search-${position.name}`)
                      )
                      
                      return positionSuppliers.length > 0 ? (
                        <>
                          <div className="text-sm text-muted-foreground mb-4">
                            Найдено {positionSuppliers.length} поставщиков для этой позиции
                          </div>
                          {positionSuppliers.map((rs) => (
                            <div
                              key={rs.id}
                              className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                            >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start space-x-3 flex-1">
                                <Avatar className="h-12 w-12">
                                  <AvatarFallback className="bg-primary text-primary-foreground">
                                    <Building2 className="h-6 w-6" />
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg mb-1">{rs.supplier.name}</h3>
                                  {rs.supplier.description && (
                                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                      {rs.supplier.description}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {getSupplierStatusBadge(rs.status)}
                                    {rs.foundVia && (
                                      <Badge variant="outline" className="text-xs">
                                        {rs.foundVia === "auto-search" ? "Авто-поиск" : rs.foundVia}
                                      </Badge>
                                    )}
                                    {rs.supplier.tags.map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center">
                                {rs.supplier.rating > 0 && (
                                  <div className="flex items-center text-yellow-600">
                                    <Star className="h-4 w-4 fill-current mr-1" />
                                    <span className="font-medium">{rs.supplier.rating.toFixed(1)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                              {rs.supplier.phone && (
                                <div className="flex items-center space-x-2">
                                  <Phone className="h-4 w-4 text-blue-600" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Телефон</p>
                                    <p className="text-sm font-medium">{rs.supplier.phone}</p>
                                  </div>
                                </div>
                              )}
                              {rs.supplier.whatsapp && (
                                <div className="flex items-center space-x-2">
                                  <MessageSquare className="h-4 w-4 text-green-600" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                                    <a
                                      href={`https://wa.me/${rs.supplier.whatsapp.replace(/\D/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm font-medium text-green-600 hover:underline"
                                    >
                                      {rs.supplier.whatsapp}
                                    </a>
                                  </div>
                                </div>
                              )}
                              {rs.supplier.email && (
                                <div className="flex items-center space-x-2">
                                  <Mail className="h-4 w-4 text-purple-600" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Email</p>
                                    <p className="text-sm font-medium">{rs.supplier.email}</p>
                                  </div>
                                </div>
                              )}
                              {rs.supplier.website && (
                                <div className="flex items-center space-x-2">
                                  <Globe className="h-4 w-4 text-gray-600" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Сайт</p>
                                    <a
                                      href={rs.supplier.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm font-medium hover:underline truncate max-w-[200px] block"
                                    >
                                      {new URL(rs.supplier.website).hostname}
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t">
                              <div className="text-sm text-muted-foreground">
                                {rs.requestSent && (
                                  <span className="flex items-center">
                                    <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                                    Запрос отправлен
                                  </span>
                                )}
                                {!rs.requestSent && (
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Ожидает отправки
                                  </span>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                {rs.supplier.whatsapp && (
                                  <Button size="sm" variant="outline">
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Отправить запрос
                                  </Button>
                                )}
                                {rs.supplier.website && (
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={rs.supplier.website} target="_blank" rel="noopener noreferrer">
                                      <Globe className="h-4 w-4 mr-2" />
                                      Сайт
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Search className="h-12 w-12 mx-auto mb-2 opacity-30" />
                          <p>Поставщики для этой позиции не найдены</p>
                          <p className="text-sm mt-1">
                            Нажмите кнопку "Найти поставщиков" выше
                          </p>
                        </div>
                      )
                    })()}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Вкладки (пока пустые, для будущего функционала) */}
      <Card>
        <CardHeader>
          <CardTitle>Дополнительная информация</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="process">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="process">Процесс</TabsTrigger>
              <TabsTrigger value="documents">Документы</TabsTrigger>
            </TabsList>

            <TabsContent value="process" className="py-4">
              <div className="text-center text-muted-foreground py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Процесс обработки заявки будет отображаться здесь</p>
                <p className="text-sm mt-1">Функционал в разработке</p>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="py-4">
              <div className="text-center text-muted-foreground py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Загруженные документы и файлы</p>
                <p className="text-sm mt-1">Функционал в разработке</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
