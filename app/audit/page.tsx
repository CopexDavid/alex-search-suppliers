"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Filter, Shield, User, FileText, Send, Eye, Loader2, Activity, Calendar, Database, Settings, Trash2, Edit, Plus, Search, MessageSquare } from "lucide-react"

// Типы данных
interface AuditLog {
  id: string
  action: string
  entity?: string
  entityId?: string
  details?: any
  ipAddress?: string
  createdAt: string
  user?: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface AuditStats {
  totalLogs: number
  todayLogs: number
  weekLogs: number
  monthLogs: number
  activeUsers: number
  topActions: Array<{
    action: string
    count: number
  }>
  recentActivity: AuditLog[]
}

interface FilterOptions {
  users: Array<{
    id: string
    name: string
    email: string
  }>
  actions: string[]
  entities: string[]
}

export default function AuditPage() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [userFilter, setUserFilter] = useState("все")
  const [actionFilter, setActionFilter] = useState("все")
  const [entityFilter, setEntityFilter] = useState("все")
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    users: [],
    actions: [],
    entities: []
  })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Загрузка данных аудита
  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)
      if (userFilter !== 'все') params.append('userId', userFilter)
      if (actionFilter !== 'все') params.append('action', actionFilter)
      if (entityFilter !== 'все') params.append('entity', entityFilter)
      
      const response = await fetch(`/api/audit?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setAuditLogs(data.data)
        setStats(data.stats)
        setFilterOptions(data.filters)
      } else {
        alert(`Ошибка: ${data.error || "Не удалось загрузить логи аудита"}`)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      alert("Ошибка: Не удалось загрузить логи аудита")
    } finally {
      setLoading(false)
    }
  }

  // Загрузка при монтировании и изменении фильтров
  useEffect(() => {
    fetchAuditLogs()
  }, [dateFrom, dateTo, userFilter, actionFilter, entityFilter])

  // Экспорт логов
  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      setExporting(true)
      const params = new URLSearchParams()
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)
      if (userFilter !== 'все') params.append('userId', userFilter)
      if (actionFilter !== 'все') params.append('action', actionFilter)
      if (entityFilter !== 'все') params.append('entity', entityFilter)
      params.append('format', format)
      
      const response = await fetch(`/api/audit/export?${params}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        alert(`✅ Логи экспортированы в формате ${format.toUpperCase()}`)
      } else {
        const errorData = await response.json()
        alert(`❌ Ошибка экспорта: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error exporting audit logs:', error)
      alert("❌ Ошибка при экспорте логов")
    } finally {
      setExporting(false)
    }
  }

  // Сброс фильтров
  const resetFilters = () => {
    setDateFrom("")
    setDateTo("")
    setUserFilter("все")
    setActionFilter("все")
    setEntityFilter("все")
  }

  const getActionIcon = (action: string) => {
    // Маппинг действий на иконки
    const iconMap: Record<string, any> = {
      'LOGIN': User,
      'LOGOUT': User,
      'CREATE_REQUEST': Plus,
      'UPDATE_REQUEST': Edit,
      'DELETE_REQUEST': Trash2,
      'SEARCH_SUPPLIERS': Search,
      'SEND_QUOTES_REQUEST': Send,
      'CREATE_SUPPLIER': Plus,
      'UPDATE_SUPPLIER': Edit,
      'DELETE_SUPPLIER': Trash2,
      'DEACTIVATE_SUPPLIER': Trash2,
      'EXPORT_AUDIT_LOGS': Download,
      'UPDATE_SETTINGS': Settings,
      'SEND_MESSAGE': MessageSquare,
      'RECEIVE_MESSAGE': MessageSquare,
      'CREATE_CHAT': MessageSquare,
      'APPROVE_REQUEST': FileText,
      'REJECT_REQUEST': FileText,
    }

    const IconComponent = iconMap[action] || Activity
    return <IconComponent className="h-4 w-4" />
  }

  const getActionBadge = (action: string) => {
    // Маппинг действий на варианты бейджей
    const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'LOGIN': "default",
      'LOGOUT': "secondary",
      'CREATE_REQUEST': "default",
      'UPDATE_REQUEST': "outline",
      'DELETE_REQUEST': "destructive",
      'SEARCH_SUPPLIERS': "secondary",
      'SEND_QUOTES_REQUEST': "default",
      'CREATE_SUPPLIER': "default",
      'UPDATE_SUPPLIER': "outline",
      'DELETE_SUPPLIER': "destructive",
      'DEACTIVATE_SUPPLIER': "destructive",
      'EXPORT_AUDIT_LOGS': "secondary",
      'UPDATE_SETTINGS': "outline",
      'SEND_MESSAGE': "default",
      'RECEIVE_MESSAGE': "secondary",
      'CREATE_CHAT': "default",
      'APPROVE_REQUEST': "default",
      'REJECT_REQUEST': "destructive",
    }

    // Переводим действия на русский для отображения
    const actionTranslations: Record<string, string> = {
      'LOGIN': 'Вход в систему',
      'LOGOUT': 'Выход из системы',
      'CREATE_REQUEST': 'Создание заявки',
      'UPDATE_REQUEST': 'Обновление заявки',
      'DELETE_REQUEST': 'Удаление заявки',
      'SEARCH_SUPPLIERS': 'Поиск поставщиков',
      'SEND_QUOTES_REQUEST': 'Отправка запроса КП',
      'CREATE_SUPPLIER': 'Создание поставщика',
      'UPDATE_SUPPLIER': 'Обновление поставщика',
      'DELETE_SUPPLIER': 'Удаление поставщика',
      'DEACTIVATE_SUPPLIER': 'Деактивация поставщика',
      'EXPORT_AUDIT_LOGS': 'Экспорт логов',
      'UPDATE_SETTINGS': 'Изменение настроек',
      'SEND_MESSAGE': 'Отправка сообщения',
      'RECEIVE_MESSAGE': 'Получение сообщения',
      'CREATE_CHAT': 'Создание чата',
      'APPROVE_REQUEST': 'Согласование заявки',
      'REJECT_REQUEST': 'Отклонение заявки',
    }

    const variant = variantMap[action] || "default"
    const displayText = actionTranslations[action] || action

    return <Badge variant={variant}>{displayText}</Badge>
  }

  // Форматирование деталей для отображения
  const formatDetails = (details: any, action: string, entity?: string) => {
    if (!details) return 'Нет подробностей'
    
    if (typeof details === 'string') return details
    
    // Специальная обработка для разных типов действий
    switch (action) {
      case 'CREATE_SUPPLIER':
      case 'UPDATE_SUPPLIER':
        return `${entity}: ${details.name || 'Неизвестно'}`
      case 'CREATE_REQUEST':
      case 'UPDATE_REQUEST':
        return `Заявка: ${details.requestNumber || details.description || 'Неизвестно'}`
      case 'SEARCH_SUPPLIERS':
        return `Найдено поставщиков: ${details.suppliersFound || 0}, позиций: ${details.positionsSearched || 0}`
      case 'EXPORT_AUDIT_LOGS':
        return `Экспортировано записей: ${details.recordsCount || 0} (${details.format || 'CSV'})`
      default:
        return JSON.stringify(details).slice(0, 100) + (JSON.stringify(details).length > 100 ? '...' : '')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Журнал аудита</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? "Загрузка..." : `Всего записей: ${auditLogs.length}`}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => handleExport('json')}
            disabled={exporting || loading}
          >
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            JSON
          </Button>
          <Button 
            onClick={() => handleExport('csv')}
            disabled={exporting || loading}
          >
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            CSV
          </Button>
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
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label>Дата с</Label>
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label>Дата по</Label>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label>Пользователь</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="все">Все пользователи</SelectItem>
                  {filterOptions.users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
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
                  {filterOptions.actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {getActionBadge(action).props.children}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Сущность</Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="все">Все сущности</SelectItem>
                  {filterOptions.entities.map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Сбросить фильтры
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего записей</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : (stats?.totalLogs || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных пользователей</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : (stats?.activeUsers || 0)}
            </div>
            <p className="text-xs text-muted-foreground">за сегодня</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Действий сегодня</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : (stats?.todayLogs || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">За неделю</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : (stats?.weekLogs || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица логов */}
      <Card>
        <CardHeader>
          <CardTitle>Журнал действий</CardTitle>
          <CardDescription>
            {loading ? "Загрузка..." : `Отображено записей: ${auditLogs.length}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Загрузка логов аудита...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Логи аудита не найдены</p>
              <p className="text-sm mt-1">Попробуйте изменить фильтры</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата/Время</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Действие</TableHead>
                  <TableHead>Сущность</TableHead>
                  <TableHead>Подробности</TableHead>
                  <TableHead>IP адрес</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {new Date(log.createdAt).toLocaleString('ru-RU')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {log.user ? log.user.name : 'Система'}
                        </div>
                        {log.user && (
                          <div className="text-sm text-muted-foreground">
                            {log.user.email}
                          </div>
                        )}
                        {log.user && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {log.user.role}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getActionIcon(log.action)}
                        {getActionBadge(log.action)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {log.entity && (
                          <Badge variant="secondary" className="text-xs">
                            {log.entity}
                          </Badge>
                        )}
                        {log.entityId && (
                          <div className="text-xs text-muted-foreground mt-1 font-mono">
                            ID: {log.entityId.slice(0, 8)}...
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div 
                        className="truncate text-sm" 
                        title={formatDetails(log.details, log.action, log.entity)}
                      >
                        {formatDetails(log.details, log.action, log.entity)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.ipAddress || 'N/A'}
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
