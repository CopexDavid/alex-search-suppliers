"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileUp, Eye, TrendingUp, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"

interface DashboardStats {
  activeRequests: number
  monthlyProcessed: number
  pendingApproval: number
  growthPercentage: string
  totalRequests: number
}

interface Request {
  id: string
  requestNumber: string
  description: string
  deadline: string
  status: string
  createdAt: string
  creator: {
    id: string
    name: string
    email: string
  }
  positions: any[]
  _count: {
    suppliers: number
    quotes: number
  }
}

interface DashboardData {
  stats: DashboardStats
  recentRequests: Request[]
  notifications: string[]
  statusCounts: Record<string, number>
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/dashboard/stats", {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Ошибка загрузки данных")
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      console.error("Dashboard data error:", err)
      setError("Не удалось загрузить данные дашборда")
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Загрузка дашборда...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>{error}</p>
        <Button onClick={loadDashboardData} variant="outline" className="mt-4 bg-transparent">
          Попробовать снова
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Нет данных для отображения</p>
      </div>
    )
  }

  const stats = [
    {
      title: "Активные заявки",
      value: data.stats.activeRequests.toString(),
      icon: Clock,
      color: "text-primary",
    },
    {
      title: "Обработано за месяц",
      value: data.stats.monthlyProcessed.toString(),
      icon: CheckCircle,
      color: "text-emerald-600",
    },
    {
      title: "На согласовании",
      value: data.stats.pendingApproval.toString(),
      icon: AlertCircle,
      color: "text-amber-600",
    },
    {
      title: "Общий рост",
      value: data.stats.growthPercentage,
      icon: TrendingUp,
      color: "text-violet-600",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Дашборд</h1>
        <div className="flex space-x-2">
          <Button asChild>
            <Link href="/requests">
              <FileUp className="mr-2 h-4 w-4" />
              Управление заявками
            </Link>
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Уведомления */}
      {data.notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-amber-600" />
              Уведомления
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.notifications.map((notification, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  • {notification}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Активные заявки */}
      <Card>
        <CardHeader>
          <CardTitle>Последние заявки</CardTitle>
          <CardDescription>Недавно созданные заявки в системе</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Заявок пока нет</p>
              <p className="text-sm mt-2">Создайте первую заявку</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер заявки</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Позиций</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Создатель</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.requestNumber}</TableCell>
                    <TableCell>{formatDate(request.createdAt)}</TableCell>
                    <TableCell className="max-w-xs truncate">{request.description}</TableCell>
                    <TableCell>{request.positions?.length || 0} шт</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{request.creator?.name || "—"}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild className="bg-transparent">
                        <Link href={`/requests/${request.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Подробнее
                        </Link>
                      </Button>
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
