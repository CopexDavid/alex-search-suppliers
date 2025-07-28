"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileUp, Eye, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const stats = [
    {
      title: "Активные заявки",
      value: "12",
      icon: Clock,
      color: "text-primary",
    },
    {
      title: "Обработано за месяц",
      value: "45",
      icon: CheckCircle,
      color: "text-emerald-600",
    },
    {
      title: "На согласовании",
      value: "3",
      icon: AlertCircle,
      color: "text-amber-600",
    },
    {
      title: "Общий рост",
      value: "+15%",
      icon: TrendingUp,
      color: "text-violet-600",
    },
  ]

  const activeRequests = [
    {
      id: "REQ-001",
      date: "2024-01-15",
      category: "Канцелярские товары",
      status: "новая",
    },
    {
      id: "REQ-002",
      date: "2024-01-14",
      category: "Компьютерная техника",
      status: "в обработке",
    },
    {
      id: "REQ-003",
      date: "2024-01-13",
      category: "Мебель",
      status: "на согласовании",
    },
    {
      id: "REQ-004",
      date: "2024-01-12",
      category: "Строительные материалы",
      status: "завершена",
    },
  ]

  const getStatusBadge = (status: string) => {
    const variants = {
      новая: "default",
      "в обработке": "secondary",
      "на согласовании": "destructive",
      завершена: "outline",
    } as const

    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Дашборд</h1>
        <Button>
          <FileUp className="mr-2 h-4 w-4" />
          Импорт заявок
        </Button>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-amber-600" />
            Уведомления
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">• 3 заявки ожидают согласования</p>
            <p className="text-sm text-muted-foreground">• 2 новых ответа от поставщиков</p>
            <p className="text-sm text-muted-foreground">• 1 заявка просрочена</p>
          </div>
        </CardContent>
      </Card>

      {/* Активные заявки */}
      <Card>
        <CardHeader>
          <CardTitle>Активные заявки</CardTitle>
          <CardDescription>Последние заявки в системе</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер заявки</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.id}</TableCell>
                  <TableCell>{request.date}</TableCell>
                  <TableCell>{request.category}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
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
        </CardContent>
      </Card>
    </div>
  )
}
