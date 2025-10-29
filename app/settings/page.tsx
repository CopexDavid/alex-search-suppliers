"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Trash2, Users, FileText, Settings, Upload, MessageSquare, Loader2, CheckCircle, XCircle, QrCode, Phone, Clock } from "lucide-react"

export default function SettingsPage() {
  // WhatsApp state
  const [whatsappStatus, setWhatsappStatus] = useState<string>('disconnected')
  const [whatsappQR, setWhatsappQR] = useState<string | null>(null)
  const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null)
  const [whatsappError, setWhatsappError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isClearingSession, setIsClearingSession] = useState(false)
  const [qrRefreshTimer, setQrRefreshTimer] = useState<number>(0)

  const users = [
    {
      id: 1,
      login: "manager@alex.kz",
      role: "Менеджер",
      status: "Активен",
      lastLogin: "2024-01-15 17:30",
    },
    {
      id: 2,
      login: "initiator@alex.kz",
      role: "Инициатор",
      status: "Активен",
      lastLogin: "2024-01-15 15:20",
    },
    {
      id: 3,
      login: "admin@alex.kz",
      role: "Администратор",
      status: "Активен",
      lastLogin: "2024-01-15 16:45",
    },
    {
      id: 4,
      login: "blocked@alex.kz",
      role: "Менеджер",
      status: "Заблокирован",
      lastLogin: "2024-01-10 12:00",
    },
  ]

  const templates = [
    {
      id: 1,
      name: "Шаблон заявки",
      type: "Заявка",
      lastModified: "2024-01-10",
    },
    {
      id: 2,
      name: "Коммерческое предложение",
      type: "Предложение",
      lastModified: "2024-01-08",
    },
    {
      id: 3,
      name: "Доверенность на закупку",
      type: "Доверенность",
      lastModified: "2024-01-05",
    },
  ]

  const getStatusBadge = (status: string) => {
    return status === "Активен" ? (
      <Badge variant="outline">Активен</Badge>
    ) : (
      <Badge variant="destructive">Заблокирован</Badge>
    )
  }

  const getRoleBadge = (role: string) => {
    const variants = {
      Администратор: "default",
      Менеджер: "secondary",
      Инициатор: "outline",
    } as const

    return <Badge variant={variants[role as keyof typeof variants]}>{role}</Badge>
  }

  // WhatsApp functions
  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status')
      if (response.ok) {
        const data = await response.json()
        setWhatsappStatus(data.status.status)
        setWhatsappPhone(data.status.phoneNumber)
        setWhatsappError(data.status.error)
        
        // Если нужен QR код - получаем его
        if (data.status.status === 'qr_ready') {
          fetchQRCode()
        }
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error)
    }
  }

  const fetchQRCode = async () => {
    try {
      const response = await fetch('/api/whatsapp/qr')
      if (response.ok) {
        const data = await response.json()
        setWhatsappQR(data.qrCode)
      }
    } catch (error) {
      console.error('Error fetching QR code:', error)
    }
  }

  const initializeWhatsApp = async () => {
    setIsInitializing(true)
    setWhatsappError(null)
    try {
      const response = await fetch('/api/whatsapp/init', { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        setWhatsappStatus(data.status.status)
      } else {
        throw new Error('Failed to initialize WhatsApp')
      }
    } catch (error: any) {
      setWhatsappError(error.message)
    } finally {
      setIsInitializing(false)
    }
  }

  const disconnectWhatsApp = async () => {
    setIsDisconnecting(true)
    try {
      const response = await fetch('/api/whatsapp/disconnect', { method: 'POST' })
      if (response.ok) {
        setWhatsappStatus('disconnected')
        setWhatsappQR(null)
        setWhatsappPhone(null)
        setWhatsappError(null)
      }
    } catch (error: any) {
      setWhatsappError(error.message)
    } finally {
      setIsDisconnecting(false)
    }
  }

  const clearWhatsAppSession = async () => {
    if (!confirm('Вы уверены, что хотите полностью очистить сессию WhatsApp? Это удалит все сохраненные данные подключения.')) {
      return
    }
    
    setIsClearingSession(true)
    setWhatsappError(null)
    try {
      const response = await fetch('/api/whatsapp/clear-session', { method: 'POST' })
      if (response.ok) {
        setWhatsappStatus('disconnected')
        setWhatsappQR(null)
        setWhatsappPhone(null)
        setWhatsappError(null)
        // Показываем успешное сообщение
        alert('Сессия WhatsApp полностью очищена. Теперь можно создать новое подключение.')
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to clear WhatsApp session')
      }
    } catch (error: any) {
      setWhatsappError(error.message)
    } finally {
      setIsClearingSession(false)
    }
  }

  // Poll WhatsApp status on mount (более частое обновление для QR)
  useEffect(() => {
    checkWhatsAppStatus()
    // Используем более частый интервал для QR кода
    const interval = setInterval(checkWhatsAppStatus, 2000) // каждые 2 секунды
    return () => clearInterval(interval)
  }, [])
  
  // Дополнительный useEffect для автообновления QR кода и таймера
  useEffect(() => {
    if (whatsappStatus === 'qr_ready') {
      setQrRefreshTimer(60) // Устанавливаем таймер на 60 секунд
      
      const qrInterval = setInterval(fetchQRCode, 3000) // обновляем QR каждые 3 секунды
      const timerInterval = setInterval(() => {
        setQrRefreshTimer(prev => Math.max(0, prev - 1))
      }, 1000)
      
      return () => {
        clearInterval(qrInterval)
        clearInterval(timerInterval)
      }
    } else {
      setQrRefreshTimer(0)
    }
  }, [whatsappStatus])

  const getWhatsAppStatusBadge = () => {
    switch (whatsappStatus) {
      case 'ready':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Подключено</Badge>
      case 'qr_ready':
        return <Badge className="bg-blue-500"><QrCode className="h-3 w-3 mr-1" /> Ожидание сканирования</Badge>
      case 'connecting':
        return <Badge className="bg-yellow-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Подключение...</Badge>
      case 'authenticated':
        return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Аутентификация...</Badge>
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Ошибка</Badge>
      default:
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" /> Отключено</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Настройки</h1>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Пользователи
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            Шаблоны
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Интеграции
          </TabsTrigger>
        </TabsList>

        {/* Управление пользователями */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Управление пользователями</CardTitle>
                  <CardDescription>Добавление, редактирование и управление доступом пользователей</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Добавить пользователя
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Добавить пользователя</DialogTitle>
                      <DialogDescription>Создание нового пользователя в системе</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Email (логин)</Label>
                        <Input type="email" placeholder="user@alex.kz" />
                      </div>

                      <div className="space-y-2">
                        <Label>Пароль</Label>
                        <Input type="password" placeholder="Временный пароль" />
                      </div>

                      <div className="space-y-2">
                        <Label>Роль</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите роль" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">Менеджер</SelectItem>
                            <SelectItem value="initiator">Инициатор</SelectItem>
                            <SelectItem value="admin">Администратор</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch id="active" defaultChecked />
                        <Label htmlFor="active">Активный пользователь</Label>
                      </div>

                      <Button className="w-full">Создать пользователя</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Логин</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Последний вход</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.login}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="font-mono text-sm">{user.lastLogin}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Edit className="mr-2 h-4 w-4" />
                                Изменить
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Редактировать пользователя</DialogTitle>
                                <DialogDescription>Изменение данных пользователя {user.login}</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Email (логин)</Label>
                                  <Input defaultValue={user.login} />
                                </div>

                                <div className="space-y-2">
                                  <Label>Роль</Label>
                                  <Select defaultValue={user.role.toLowerCase()}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="manager">Менеджер</SelectItem>
                                      <SelectItem value="initiator">Инициатор</SelectItem>
                                      <SelectItem value="admin">Администратор</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Switch id="active-edit" defaultChecked={user.status === "Активен"} />
                                  <Label htmlFor="active-edit">Активный пользователь</Label>
                                </div>

                                <div className="space-y-2">
                                  <Label>Новый пароль (оставьте пустым, если не меняете)</Label>
                                  <Input type="password" placeholder="Новый пароль" />
                                </div>

                                <Button className="w-full">Сохранить изменения</Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 bg-transparent"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Шаблоны */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Шаблоны документов</CardTitle>
                  <CardDescription>Управление шаблонами для заявок, предложений и доверенностей</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Upload className="mr-2 h-4 w-4" />
                      Загрузить шаблон
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Загрузить новый шаблон</DialogTitle>
                      <DialogDescription>Добавление нового шаблона документа</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Название шаблона</Label>
                        <Input placeholder="Название шаблона" />
                      </div>

                      <div className="space-y-2">
                        <Label>Тип документа</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="request">Заявка</SelectItem>
                            <SelectItem value="proposal">Предложение</SelectItem>
                            <SelectItem value="power-of-attorney">Доверенность</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Файл шаблона</Label>
                        <Input type="file" accept=".docx,.doc,.pdf" />
                      </div>

                      <div className="space-y-2">
                        <Label>Описание</Label>
                        <Textarea placeholder="Описание шаблона и его использования..." />
                      </div>

                      <Button className="w-full">Загрузить шаблон</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Последнее изменение</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.type}</Badge>
                      </TableCell>
                      <TableCell>{template.lastModified}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="mr-2 h-4 w-4" />
                            Редактировать
                          </Button>
                          <Button variant="outline" size="sm">
                            <Upload className="mr-2 h-4 w-4" />
                            Заменить
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 bg-transparent"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Интеграции */}
        <TabsContent value="integrations" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* WhatsApp */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <MessageSquare className="mr-2 h-5 w-5" />
                      WhatsApp интеграция
                    </CardTitle>
                    <CardDescription>Подключите WhatsApp для автоматической отправки сообщений поставщикам</CardDescription>
                  </div>
                  {getWhatsAppStatusBadge()}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Информация о подключении */}
                {whatsappPhone && (
                  <Alert className="bg-green-50 border-green-200">
                    <Phone className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Подключен номер: <strong>+{whatsappPhone}</strong>
                    </AlertDescription>
                  </Alert>
                )}

                {whatsappError && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{whatsappError}</AlertDescription>
                  </Alert>
                )}

                {/* QR Code */}
                {whatsappStatus === 'qr_ready' && whatsappQR && (
                  <div className="flex flex-col items-center space-y-4 p-6 border rounded-lg bg-muted/30">
                    <div className="text-center space-y-2">
                      <h3 className="font-semibold text-lg">Отсканируйте QR код</h3>
                      <p className="text-sm text-muted-foreground">
                        Откройте WhatsApp на телефоне → Настройки → Связанные устройства → Связать устройство
                      </p>
                      {qrRefreshTimer > 0 && (
                        <Badge variant="outline" className="mt-2">
                          <Clock className="h-3 w-3 mr-1" />
                          QR активен: {qrRefreshTimer}с
                        </Badge>
                      )}
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <img 
                        src={whatsappQR} 
                        alt="WhatsApp QR Code" 
                        className="w-64 h-64"
                        key={whatsappQR} // Force re-render on QR change
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">QR код автоматически обновляется каждые 3 секунды</p>
                  </div>
                )}

                {/* Статус подключения */}
                {whatsappStatus === 'connecting' && (
                  <div className="flex flex-col items-center space-y-4 p-6 border rounded-lg bg-muted/30">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Инициализация WhatsApp клиента...</p>
                  </div>
                )}

                {whatsappStatus === 'authenticated' && (
                  <div className="flex flex-col items-center space-y-4 p-6 border rounded-lg bg-muted/30">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Завершение аутентификации...</p>
                  </div>
                )}

                {whatsappStatus === 'ready' && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>WhatsApp успешно подключен!</strong><br />
                      Теперь вы можете отправлять сообщения поставщикам автоматически.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Кнопки управления */}
                <div className="flex gap-3">
                  {whatsappStatus === 'disconnected' && (
                    <Button 
                      onClick={initializeWhatsApp}
                      disabled={isInitializing}
                      className="flex-1"
                    >
                      {isInitializing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Инициализация...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Подключить WhatsApp
                        </>
                      )}
                    </Button>
                  )}

                  {whatsappStatus === 'ready' && (
                    <>
                      <Button 
                        onClick={disconnectWhatsApp}
                        disabled={isDisconnecting || isClearingSession}
                        variant="destructive"
                        className="flex-1"
                      >
                        {isDisconnecting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Отключение...
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            Отключить WhatsApp
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={clearWhatsAppSession}
                        disabled={isClearingSession || isDisconnecting}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {isClearingSession ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Очистка...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Сменить аккаунт
                          </>
                        )}
                      </Button>
                    </>
                  )}

                  {(whatsappStatus === 'qr_ready' || whatsappStatus === 'connecting') && (
                    <Button 
                      onClick={disconnectWhatsApp}
                      disabled={isDisconnecting}
                      variant="outline"
                      className="flex-1"
                    >
                      Отменить
                    </Button>
                  )}
                </div>

                {/* Дополнительные действия */}
                {(whatsappStatus === 'disconnected' || whatsappStatus === 'error') && (
                  <div className="pt-4 border-t">
                    <Button 
                      onClick={clearWhatsAppSession}
                      disabled={isClearingSession}
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {isClearingSession ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Очистка сессии...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Очистить сессию полностью
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Удаляет все сохраненные данные подключения WhatsApp
                    </p>
                  </div>
                )}

                {/* Информация */}
                <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t">
                  <p><strong>Как это работает:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Нажмите "Подключить WhatsApp"</li>
                    <li>Отсканируйте QR код через мобильное приложение WhatsApp</li>
                    <li>После подключения сессия сохраняется автоматически</li>
                    <li>При следующем запуске переподключение не потребуется</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 1С интеграция */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  1С интеграция
                </CardTitle>
                <CardDescription>Настройка импорта/экспорта данных с 1С</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Путь для импорта CSV/Excel</Label>
                  <Input placeholder="C:\1C\Import\" />
                </div>

                <div className="space-y-2">
                  <Label>Путь для экспорта</Label>
                  <Input placeholder="C:\1C\Export\" />
                </div>

                <div className="space-y-2">
                  <Label>Формат файлов</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите формат" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel (XLSX)</SelectItem>
                      <SelectItem value="both">Оба формата</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="auto-import" />
                  <Label htmlFor="auto-import">Автоматический импорт</Label>
                </div>

                <Button className="w-full">Сохранить настройки 1С</Button>
              </CardContent>
            </Card>
          </div>

          {/* Общие настройки системы */}
          <Card>
            <CardHeader>
              <CardTitle>Общие настройки системы</CardTitle>
              <CardDescription>Основные параметры работы системы</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Время хранения логов (дни)</Label>
                  <Input type="number" defaultValue="90" />
                </div>

                <div className="space-y-2">
                  <Label>Максимальный размер файла (МБ)</Label>
                  <Input type="number" defaultValue="10" />
                </div>

                <div className="space-y-2">
                  <Label>Часовой пояс</Label>
                  <Select defaultValue="almaty">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="almaty">Алматы (UTC+6)</SelectItem>
                      <SelectItem value="astana">Астана (UTC+6)</SelectItem>
                      <SelectItem value="moscow">Москва (UTC+3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Язык интерфейса</Label>
                  <Select defaultValue="ru">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="kz">Казахский</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="email-notifications" defaultChecked />
                  <Label htmlFor="email-notifications">Email уведомления</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="auto-backup" defaultChecked />
                  <Label htmlFor="auto-backup">Автоматическое резервное копирование</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="audit-logging" defaultChecked />
                  <Label htmlFor="audit-logging">Расширенное логирование</Label>
                </div>
              </div>

              <Button>Сохранить общие настройки</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
