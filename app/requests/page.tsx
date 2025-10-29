"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, Eye, Check, Filter, Loader2 } from "lucide-react"
import Link from "next/link"
import { RequestUploadDialog } from "@/components/request-upload-dialog"
import { RequestCreateDialog } from "@/components/request-create-dialog"

interface Position {
  id: string
  name: string
  description: string
  quantity: number
  unit: string
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
  positions: Position[]
  creator: {
    id: string
    name: string
    email: string
  }
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")

  // Загрузка заявок
  useEffect(() => {
    loadRequests()
  }, [statusFilter, dateFilter])

  const loadRequests = async () => {
    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (dateFilter) params.append("date", dateFilter)

      const response = await fetch(`/api/requests?${params.toString()}`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Ошибка загрузки заявок")
      }

      const data = await response.json()
      setRequests(data.data || [])
    } catch (err) {
      console.error("Load requests error:", err)
      setError("Не удалось загрузить заявки")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      UPLOADED: { label: "новая", variant: "default" },
      SEARCHING: { label: "поиск", variant: "secondary" },
      PENDING_QUOTES: { label: "ожидание КП", variant: "secondary" },
      COMPARING: { label: "сравнение", variant: "secondary" },
      APPROVED: { label: "согласована", variant: "outline" },
      REJECTED: { label: "отклонена", variant: "destructive" },
      COMPLETED: { label: "завершена", variant: "outline" },
      ARCHIVED: { label: "архив", variant: "outline" },
    }

    const statusInfo = statusMap[status] || { label: status, variant: "default" as const }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  const getPriorityBadge = (priority: number) => {
    const priorities = [
      { label: "Низкий", variant: "outline" as const },
      { label: "Средний", variant: "secondary" as const },
      { label: "Высокий", variant: "destructive" as const },
    ]
    const priorityInfo = priorities[priority] || priorities[1]
    return <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU")
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Управление заявками</h1>
        <div className="flex space-x-2">
          <RequestUploadDialog />
          <RequestCreateDialog />
        </div>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Статус</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="UPLOADED">Новая</SelectItem>
                  <SelectItem value="SEARCHING">Поиск</SelectItem>
                  <SelectItem value="PENDING_QUOTES">Ожидание КП</SelectItem>
                  <SelectItem value="COMPARING">Сравнение</SelectItem>
                  <SelectItem value="APPROVED">Согласована</SelectItem>
                  <SelectItem value="COMPLETED">Завершена</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Дата</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="дд.мм.гггг"
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all")
                  setDateFilter("")
                }}
                className="w-full bg-transparent"
              >
                Сбросить фильтры
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список заявок */}
      <Card>
        <CardHeader>
          <CardTitle>
            Список заявок
            {!loading && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (Всего: {requests.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Загрузка заявок...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>{error}</p>
              <Button onClick={loadRequests} variant="outline" className="mt-4 bg-transparent">
                Попробовать снова
              </Button>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Заявок не найдено</p>
              <p className="text-sm mt-2">Создайте первую заявку или загрузите из файла</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Позиций</TableHead>
                  <TableHead>Срок</TableHead>
                  <TableHead>Приоритет</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Создатель</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.requestNumber}</TableCell>
                    <TableCell>{formatDate(request.createdAt)}</TableCell>
                    <TableCell className="max-w-xs truncate">{request.description}</TableCell>
                    <TableCell>{request.positions?.length || 0} шт</TableCell>
                    <TableCell>{formatDate(request.deadline)}</TableCell>
                    <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{request.creator?.name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Link href={`/requests/${request.id}`}>
                          <Button variant="outline" size="sm" className="bg-transparent">
                            <Eye className="h-4 w-4 mr-1" />
                            Просмотр
                          </Button>
                        </Link>
                        {request.status === "UPLOADED" && (
                          <Button variant="default" size="sm">
                            <Send className="h-4 w-4 mr-1" />
                            Отправить
                          </Button>
                        )}
                        {request.status === "APPROVED" && (
                          <Button variant="outline" size="sm" className="bg-transparent">
                            <Check className="h-4 w-4 mr-1" />
                            Завершить
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
