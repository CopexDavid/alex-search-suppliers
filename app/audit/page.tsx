"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Filter, Shield, User, FileText, Send, Eye } from "lucide-react"

export default function AuditPage() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [userFilter, setUserFilter] = useState("все")
  const [actionFilter, setActionFilter] = useState("все")

  const auditLogs = [
    {
      id: 1,
      timestamp: "2024-01-15 14:30:25",
      user: "manager@alex.kz",
      action: "Вход в систему",
      details: "Успешная авторизация",
      ip: "192.168.1.100",
    },
    {
      id: 2,
      timestamp: "2024-01-15 14:35:12",
      user: "manager@alex.kz",
      action: "Отправка заявки",
      details: "Заявка REQ-001 отправлена поставщику ТОО Канцтовары Плюс",
      ip: "192.168.1.100",
    },
    {
      id: 3,
      timestamp: "2024-01-15 15:20:45",
      user: "initiator@alex.kz",
      action: "Согласование заявки",
      details: "Заявка REQ-002 согласована",
      ip: "192.168.1.105",
    },
    {
      id: 4,
      timestamp: "2024-01-15 16:10:33",
      user: "admin@alex.kz",
      action: "Добавление поставщика",
      details: "Добавлен новый поставщик: ИП Новый Поставщик",
      ip: "192.168.1.101",
    },
    {
      id: 5,
      timestamp: "2024-01-15 16:45:18",
      user: "manager@alex.kz",
      action: "Просмотр ответов",
      details: "Просмотрены ответы по заявке REQ-001",
      ip: "192.168.1.100",
    },
    {
      id: 6,
      timestamp: "2024-01-15 17:15:22",
      user: "admin@alex.kz",
      action: "Изменение настроек",
      details: "Обновлены настройки WhatsApp интеграции",
      ip: "192.168.1.101",
    },
  ]

  const getActionIcon = (action: string) => {
    switch (action) {
      case "Вход в систему":
        return <User className="h-4 w-4" />
      case "Отправка заявки":
        return <Send className="h-4 w-4" />
      case "Согласование заявки":
        return <FileText className="h-4 w-4" />
      case "Просмотр ответов":
        return <Eye className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const getActionBadge = (action: string) => {
    const variants = {
      "Вход в систему": "default",
      "Отправка заявки": "secondary",
      "Согласование заявки": "outline",
      "Добавление поставщика": "destructive",
      "Просмотр ответов": "default",
      "Изменение настроек": "secondary",
    } as const

    return <Badge variant={variants[action as keyof typeof variants] || "default"}>{action}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Журнал аудита</h1>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Экспорт логов
        </Button>
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
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Дата с</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Дата по</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Пользователь</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="все">Все пользователи</SelectItem>
                  <SelectItem value="manager@alex.kz">manager@alex.kz</SelectItem>
                  <SelectItem value="initiator@alex.kz">initiator@alex.kz</SelectItem>
                  <SelectItem value="admin@alex.kz">admin@alex.kz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Тип действия</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="все">Все действия</SelectItem>
                  <SelectItem value="Вход в систему">Вход в систему</SelectItem>
                  <SelectItem value="Отправка заявки">Отправка заявки</SelectItem>
                  <SelectItem value="Согласование заявки">Согласование заявки</SelectItem>
                  <SelectItem value="Добавление поставщика">Добавление поставщика</SelectItem>
                  <SelectItem value="Просмотр ответов">Просмотр ответов</SelectItem>
                  <SelectItem value="Изменение настроек">Изменение настроек</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего записей</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных пользователей</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Действий сегодня</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Заявок отправлено</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица логов */}
      <Card>
        <CardHeader>
          <CardTitle>Журнал действий</CardTitle>
          <CardDescription>Все действия пользователей в системе</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата/Время</TableHead>
                <TableHead>Пользователь</TableHead>
                <TableHead>Действие</TableHead>
                <TableHead>Подробности</TableHead>
                <TableHead>IP адрес</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                  <TableCell>{log.user}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getActionIcon(log.action)}
                      {getActionBadge(log.action)}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate" title={log.details}>
                      {log.details}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.ip}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
