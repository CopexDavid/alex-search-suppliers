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
import { Plus, Edit, Trash2, Users, FileText, Settings, Upload, MessageSquare, Loader2, CheckCircle, XCircle, QrCode, Phone, Clock, Brain, Save, RefreshCw } from "lucide-react"

interface User {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
  lastLogin: string | null
}

export default function SettingsPage() {
  // Users state
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState("")

  // User form state
  const [userFormData, setUserFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "",
    isActive: true,
  })
  const [userFormLoading, setUserFormLoading] = useState(false)
  const [userFormError, setUserFormError] = useState("")
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // WhatsApp (Whapi.Cloud) state
  const [whatsappStatus, setWhatsappStatus] = useState<string>('disconnected')
  const [whatsappQR, setWhatsappQR] = useState<string | null>(null)
  const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null)
  const [whatsappError, setWhatsappError] = useState<string | null>(null)
  const [whapiToken, setWhapiToken] = useState<string>('')
  const [tokenSaving, setTokenSaving] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const [maskedToken, setMaskedToken] = useState<string | null>(null)
  const [testPhone, setTestPhone] = useState('+77075112805')
  const [testSending, setTestSending] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSetting, setWebhookSetting] = useState(false)
  const [currentWebhook, setCurrentWebhook] = useState<string | null>(null)
  const [recommendedWebhookUrl, setRecommendedWebhookUrl] = useState<string | null>(null)
  
  // OpenAI настройки
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [openaiAssistantId, setOpenaiAssistantId] = useState('')
  const [openaiSaving, setOpenaiSaving] = useState(false)
  const [hasOpenaiSettings, setHasOpenaiSettings] = useState(false)
  const [maskedOpenaiKey, setMaskedOpenaiKey] = useState<string | null>(null)

  // Системные настройки
  const [suppliersToContact, setSuppliersToContact] = useState(3)
  const [systemSettingsSaving, setSystemSettingsSaving] = useState(false)

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
    const roleNames = {
      ADMIN: "Администратор",
      PURCHASER: "Закупщик", 
      MANAGER: "Руководитель",
      VIEWER: "Наблюдатель",
    } as const

    const variants = {
      ADMIN: "default",
      PURCHASER: "secondary",
      MANAGER: "outline",
      VIEWER: "outline",
    } as const

    const roleName = roleNames[role as keyof typeof roleNames] || role
    const variant = variants[role as keyof typeof variants] || "outline"

    return <Badge variant={variant}>{roleName}</Badge>
  }

  // Функции для работы с пользователями
  const loadUsers = async () => {
    setUsersLoading(true)
    setUsersError("")
    
    try {
      const response = await fetch('/api/users', {
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error('Ошибка при загрузке пользователей')
      }
      
      const data = await response.json()
      setUsers(data.data || [])
    } catch (error: any) {
      console.error('Load users error:', error)
      setUsersError(error.message || 'Не удалось загрузить пользователей')
    } finally {
      setUsersLoading(false)
    }
  }

  const createUser = async () => {
    if (!userFormData.email || !userFormData.password || !userFormData.name || !userFormData.role) {
      setUserFormError("Заполните все обязательные поля")
      return
    }

    setUserFormLoading(true)
    setUserFormError("")

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userFormData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании пользователя')
      }

      // Обновляем список пользователей
      await loadUsers()
      
      // Сбрасываем форму и закрываем диалог
      setUserFormData({
        email: "",
        password: "",
        name: "",
        role: "",
        isActive: true,
      })
      setCreateDialogOpen(false)
    } catch (error: any) {
      console.error('Create user error:', error)
      setUserFormError(error.message)
    } finally {
      setUserFormLoading(false)
    }
  }

  const updateUser = async () => {
    if (!editingUser || !userFormData.email || !userFormData.name || !userFormData.role) {
      setUserFormError("Заполните все обязательные поля")
      return
    }

    setUserFormLoading(true)
    setUserFormError("")

    try {
      const updateData = {
        email: userFormData.email,
        name: userFormData.name,
        role: userFormData.role,
        isActive: userFormData.isActive,
      }

      // Добавляем пароль только если он указан
      if (userFormData.password) {
        (updateData as any).password = userFormData.password
      }

      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при обновлении пользователя')
      }

      // Обновляем список пользователей
      await loadUsers()
      
      // Сбрасываем форму и закрываем диалог
      setUserFormData({
        email: "",
        password: "",
        name: "",
        role: "",
        isActive: true,
      })
      setEditingUser(null)
      setEditDialogOpen(false)
    } catch (error: any) {
      console.error('Update user error:', error)
      setUserFormError(error.message)
    } finally {
      setUserFormLoading(false)
    }
  }

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${userEmail}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при удалении пользователя')
      }

      // Обновляем список пользователей
      await loadUsers()
    } catch (error: any) {
      console.error('Delete user error:', error)
      alert(`Ошибка при удалении пользователя: ${error.message}`)
    }
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setUserFormData({
      email: user.email,
      password: "", // пароль не заполняем при редактировании
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    })
    setUserFormError("")
    setEditDialogOpen(true)
  }

  const openCreateDialog = () => {
    setUserFormData({
      email: "",
      password: "",
      name: "",
      role: "",
      isActive: true,
    })
    setUserFormError("")
    setCreateDialogOpen(true)
  }

  // WhatsApp (Whapi.Cloud) functions
  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status')
      if (response.ok) {
        const data = await response.json()
        setWhatsappStatus(data.status.status)
        setWhatsappPhone(data.status.phoneNumber)
        setWhatsappError(data.status.error)
        setWhatsappQR(data.status.qrCode)
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error)
    }
  }

  const loadWhapiToken = async () => {
    try {
      const response = await fetch('/api/settings/whapi-token', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setHasToken(data.data.hasToken)
        setMaskedToken(data.data.maskedToken)
      }
    } catch (error) {
      console.error('Error loading Whapi token:', error)
    }
  }

  const saveWhapiToken = async () => {
    if (!whapiToken.trim()) {
      alert('Введите токен Whapi.Cloud')
      return
    }

    setTokenSaving(true)
    try {
      const response = await fetch('/api/settings/whapi-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ token: whapiToken })
      })

      const data = await response.json()

      if (response.ok) {
        alert('Токен успешно сохранен!')
        setWhapiToken('')
        await loadWhapiToken() // Перезагружаем информацию о токене
      } else {
        alert(`Ошибка: ${data.error}`)
      }
    } catch (error) {
      console.error('Error saving token:', error)
      alert('Ошибка сохранения токена')
    } finally {
      setTokenSaving(false)
    }
  }

  const deleteWhapiToken = async () => {
    if (!confirm('Вы уверены, что хотите удалить токен Whapi.Cloud?')) {
      return
    }

    try {
      const response = await fetch('/api/settings/whapi-token', {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        alert('Токен успешно удален!')
        await loadWhapiToken()
      } else {
        alert(`Ошибка: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting token:', error)
      alert('Ошибка удаления токена')
    }
  }

  const sendTestMessage = async () => {
    if (!testPhone.trim()) {
      alert('Введите номер телефона')
      return
    }

    setTestSending(true)
    try {
      const response = await fetch('/api/whatsapp/test-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          phoneNumber: testPhone,
          message: `🤖 Тестовое сообщение от системы Alex\n\nВремя: ${new Date().toLocaleString('ru-RU')}\n\nЭто автоматическое сообщение для проверки интеграции с Whapi.Cloud. ✅`
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`✅ Сообщение успешно отправлено на ${testPhone}!`)
      } else {
        if (data.qrCode) {
          alert(`❌ ${data.error}\n\nВозможно, нужно отсканировать QR код для подключения WhatsApp.`)
        } else {
          alert(`❌ Ошибка: ${data.error}`)
        }
      }
    } catch (error) {
      console.error('Error sending test message:', error)
      alert('❌ Ошибка при отправке сообщения')
    } finally {
      setTestSending(false)
    }
  }

  const loadWebhookSettings = async () => {
    try {
      const [settingsResponse, recommendedResponse] = await Promise.all([
        fetch('/api/whatsapp/webhook/setup', { credentials: 'include' }),
        fetch('/api/whatsapp/webhook/auto-setup', { credentials: 'include' })
      ])
      
      if (settingsResponse.ok) {
        const data = await settingsResponse.json()
        setCurrentWebhook(data.data.webhook?.url || null)
      }
      
      if (recommendedResponse.ok) {
        const recommendedData = await recommendedResponse.json()
        const recommended = recommendedData.data.recommendedUrl
        setRecommendedWebhookUrl(recommended)
        
        // Если нет текущего webhook, используем рекомендуемый
        if (!currentWebhook) {
          setWebhookUrl(recommended)
        } else {
          setWebhookUrl(currentWebhook)
        }
      }
    } catch (error) {
      console.error('Error loading webhook settings:', error)
    }
  }

  const setupWebhook = async () => {
    if (!webhookUrl.trim()) {
      alert('Введите URL webhook')
      return
    }

    setWebhookSetting(true)
    try {
      const response = await fetch('/api/whatsapp/webhook/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ webhookUrl })
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Webhook успешно настроен!')
        await loadWebhookSettings()
      } else {
        alert(`❌ Ошибка: ${data.error}`)
      }
    } catch (error) {
      console.error('Error setting up webhook:', error)
      alert('❌ Ошибка при настройке webhook')
    } finally {
      setWebhookSetting(false)
    }
  }

  const autoSetupWebhook = async () => {
    setWebhookSetting(true)
    try {
      const response = await fetch('/api/whatsapp/webhook/auto-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        alert(`✅ Webhook автоматически настроен!\nURL: ${data.webhookUrl}`)
        setWebhookUrl(data.webhookUrl)
        await loadWebhookSettings()
      } else {
        alert(`❌ Ошибка: ${data.error}`)
      }
    } catch (error) {
      console.error('Error auto-setting up webhook:', error)
      alert('❌ Ошибка при автоматической настройке webhook')
    } finally {
      setWebhookSetting(false)
    }
  }

  // OpenAI функции
  const loadOpenaiSettings = async () => {
    try {
      const response = await fetch('/api/settings/openai', {
        credentials: 'include'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setHasOpenaiSettings(data.data.hasApiKey)
        setMaskedOpenaiKey(data.data.maskedApiKey)
        setOpenaiAssistantId(data.data.assistantId || '')
      } else {
        console.error('Ошибка загрузки настроек OpenAI:', data.error)
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек OpenAI:', error)
    }
  }

  const saveOpenaiSettings = async () => {
    if (!openaiApiKey.trim() || !openaiAssistantId.trim()) {
      alert('Заполните все поля')
      return
    }

    setOpenaiSaving(true)
    try {
      const response = await fetch('/api/settings/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          apiKey: openaiApiKey.trim(),
          assistantId: openaiAssistantId.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Настройки OpenAI сохранены!')
        setOpenaiApiKey('')
        setOpenaiAssistantId('')
        await loadOpenaiSettings()
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек OpenAI:', error)
      alert('❌ Ошибка при сохранении настроек OpenAI')
    } finally {
      setOpenaiSaving(false)
    }
  }

  const deleteOpenaiSettings = async () => {
    if (!confirm('Вы уверены, что хотите удалить настройки OpenAI?')) {
      return
    }

    setOpenaiSaving(true)
    try {
      const response = await fetch('/api/settings/openai', {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Настройки OpenAI удалены!')
        setHasOpenaiSettings(false)
        setMaskedOpenaiKey(null)
        setOpenaiApiKey('')
        setOpenaiAssistantId('')
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Ошибка удаления настроек OpenAI:', error)
      alert('❌ Ошибка при удалении настроек OpenAI')
    } finally {
      setOpenaiSaving(false)
    }
  }

  // Загрузка системных настроек
  const loadSystemSettings = async () => {
    try {
      const response = await fetch('/api/settings/system', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setSuppliersToContact(data.suppliers_to_contact || 3)
      }
    } catch (error) {
      console.error('Ошибка загрузки системных настроек:', error)
    }
  }

  // Сохранение системных настроек
  const saveSystemSettings = async () => {
    setSystemSettingsSaving(true)
    try {
      const response = await fetch('/api/settings/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          suppliers_to_contact: suppliersToContact
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        alert('✅ Системные настройки сохранены!')
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Ошибка сохранения системных настроек:', error)
      alert('❌ Ошибка при сохранении системных настроек')
    } finally {
      setSystemSettingsSaving(false)
    }
  }

  // Загрузка пользователей при монтировании
  useEffect(() => {
    loadUsers()
    loadWhapiToken()
    loadWebhookSettings()
    loadOpenaiSettings()
    loadSystemSettings()
  }, [])

  // Poll WhatsApp status on mount
  useEffect(() => {
    checkWhatsAppStatus()
    const interval = setInterval(checkWhatsAppStatus, 5000) // каждые 5 секунд
    return () => clearInterval(interval)
  }, [])

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
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={openCreateDialog}>
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
                      {userFormError && (
                        <Alert variant="destructive">
                          <AlertDescription>{userFormError}</AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-2">
                        <Label>Имя пользователя</Label>
                        <Input 
                          placeholder="Иван Иванов"
                          value={userFormData.name}
                          onChange={(e) => setUserFormData({...userFormData, name: e.target.value})}
                          disabled={userFormLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Email (логин)</Label>
                        <Input 
                          type="email" 
                          placeholder="user@alex.kz"
                          value={userFormData.email}
                          onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                          disabled={userFormLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Пароль</Label>
                        <Input 
                          type="password" 
                          placeholder="Временный пароль"
                          value={userFormData.password}
                          onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                          disabled={userFormLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Роль</Label>
                        <Select 
                          value={userFormData.role} 
                          onValueChange={(value) => setUserFormData({...userFormData, role: value})}
                          disabled={userFormLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите роль" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Администратор</SelectItem>
                            <SelectItem value="PURCHASER">Закупщик</SelectItem>
                            <SelectItem value="MANAGER">Руководитель</SelectItem>
                            <SelectItem value="VIEWER">Наблюдатель</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="active" 
                          checked={userFormData.isActive}
                          onCheckedChange={(checked) => setUserFormData({...userFormData, isActive: checked})}
                          disabled={userFormLoading}
                        />
                        <Label htmlFor="active">Активный пользователь</Label>
                      </div>

                      <Button 
                        className="w-full" 
                        onClick={createUser}
                        disabled={userFormLoading}
                      >
                        {userFormLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Создание...
                          </>
                        ) : (
                          "Создать пользователя"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {usersError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{usersError}</AlertDescription>
                </Alert>
              )}

              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Загрузка пользователей...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Последний вход</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="font-mono text-sm">{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user.isActive ? "Активен" : "Заблокирован")}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleString('ru-RU') : 'Никогда'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Изменить
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 bg-transparent"
                              onClick={() => deleteUser(user.id, user.email)}
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
              )}
            </CardContent>
          </Card>

          {/* Диалог редактирования пользователя */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Редактировать пользователя</DialogTitle>
                <DialogDescription>
                  Изменение данных пользователя {editingUser?.email}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {userFormError && (
                  <Alert variant="destructive">
                    <AlertDescription>{userFormError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Имя пользователя</Label>
                  <Input 
                    placeholder="Иван Иванов"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({...userFormData, name: e.target.value})}
                    disabled={userFormLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email (логин)</Label>
                  <Input 
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                    disabled={userFormLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Роль</Label>
                  <Select 
                    value={userFormData.role} 
                    onValueChange={(value) => setUserFormData({...userFormData, role: value})}
                    disabled={userFormLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Администратор</SelectItem>
                      <SelectItem value="PURCHASER">Закупщик</SelectItem>
                      <SelectItem value="MANAGER">Руководитель</SelectItem>
                      <SelectItem value="VIEWER">Наблюдатель</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="active-edit" 
                    checked={userFormData.isActive}
                    onCheckedChange={(checked) => setUserFormData({...userFormData, isActive: checked})}
                    disabled={userFormLoading}
                  />
                  <Label htmlFor="active-edit">Активный пользователь</Label>
                </div>

                <div className="space-y-2">
                  <Label>Новый пароль (оставьте пустым, если не меняете)</Label>
                  <Input 
                    type="password" 
                    placeholder="Новый пароль"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                    disabled={userFormLoading}
                  />
                </div>

                <Button 
                  className="w-full"
                  onClick={updateUser}
                  disabled={userFormLoading}
                >
                  {userFormLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    "Сохранить изменения"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                      WhatsApp интеграция (Whapi.Cloud)
                    </CardTitle>
                    <CardDescription>Подключите WhatsApp через Whapi.Cloud API для автоматической отправки сообщений поставщикам</CardDescription>
                  </div>
                  {getWhatsAppStatusBadge()}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Настройка токена */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h3 className="font-semibold text-lg">Настройка API токена</h3>
                  <p className="text-sm text-muted-foreground">
                    Получите токен на <a href="https://whapi.cloud" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">whapi.cloud</a> и введите его ниже
                  </p>
                  
                  {/* Текущий токен */}
                  {hasToken && maskedToken && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-800">Токен настроен</p>
                          <p className="text-xs text-green-600 font-mono">{maskedToken}</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={deleteWhapiToken}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Форма для нового токена */}
                  <div className="flex space-x-2">
                    <Input
                      type="password"
                      placeholder={hasToken ? "Введите новый токен для замены" : "Введите ваш Whapi.Cloud токен"}
                      value={whapiToken}
                      onChange={(e) => setWhapiToken(e.target.value)}
                      disabled={tokenSaving}
                    />
                    <Button 
                      onClick={saveWhapiToken}
                      disabled={tokenSaving || !whapiToken.trim()}
                    >
                      {tokenSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Сохранение...
                        </>
                      ) : (
                        hasToken ? 'Заменить' : 'Сохранить'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Тестирование отправки сообщений */}
                {hasToken && (
                  <div className="space-y-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <h3 className="font-semibold text-lg text-blue-900">Тестирование отправки</h3>
                    <p className="text-sm text-blue-700">
                      Отправьте тестовое сообщение для проверки работы Whapi.Cloud
                    </p>
                    <div className="flex space-x-2">
                      <Input
                        type="tel"
                        placeholder="Номер телефона (+77075112805)"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        disabled={testSending}
                        className="flex-1"
                      />
                      <Button 
                        onClick={sendTestMessage}
                        disabled={testSending || !testPhone.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {testSending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Отправка...
                          </>
                        ) : (
                          <>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Отправить тест
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Настройка Webhook для входящих сообщений */}
                {hasToken && (
                  <div className="space-y-4 p-4 border rounded-lg bg-purple-50 border-purple-200">
                    <h3 className="font-semibold text-lg text-purple-900">Настройка Webhook</h3>
                    <p className="text-sm text-purple-700">
                      Настройте webhook для получения входящих сообщений в реальном времени
                    </p>
                    
                    {/* Текущий webhook */}
                    {currentWebhook && (
                      <div className="p-3 bg-purple-100 border border-purple-300 rounded-lg">
                        <p className="text-sm font-medium text-purple-800">Текущий webhook:</p>
                        <p className="text-xs text-purple-600 font-mono break-all">{currentWebhook}</p>
                      </div>
                    )}
                    
                    {/* Рекомендуемый webhook */}
                    {recommendedWebhookUrl && recommendedWebhookUrl !== currentWebhook && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-800">Рекомендуемый URL для продакшена:</p>
                            <p className="text-xs text-blue-600 font-mono break-all">{recommendedWebhookUrl}</p>
                          </div>
                          <Button 
                            size="sm"
                            onClick={autoSetupWebhook}
                            disabled={webhookSetting}
                            className="ml-2 bg-blue-600 hover:bg-blue-700"
                          >
                            {webhookSetting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Применить'
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <Input
                        type="url"
                        placeholder="https://yourdomain.com/api/whatsapp/webhook"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        disabled={webhookSetting}
                        className="flex-1"
                      />
                      <Button 
                        onClick={autoSetupWebhook}
                        disabled={webhookSetting}
                        className="bg-green-600 hover:bg-green-700"
                        title="Автоматически настроить webhook с ngrok URL"
                      >
                        {webhookSetting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Авто...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Авто
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={setupWebhook}
                        disabled={webhookSetting || !webhookUrl.trim()}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {webhookSetting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Настройка...
                          </>
                        ) : (
                          <>
                            <Settings className="mr-2 h-4 w-4" />
                            Настроить
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div className="text-xs text-purple-600">
                      💡 Используйте кнопку "Авто" для автоматической настройки с ngrok URL, или введите свой URL и нажмите "Настроить"
                    </div>
                  </div>
                )}

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

                {/* QR Code для Whapi.Cloud */}
                {whatsappStatus === 'qr_ready' && whatsappQR && (
                  <div className="flex flex-col items-center space-y-4 p-6 border rounded-lg bg-muted/30">
                    <div className="text-center space-y-2">
                      <h3 className="font-semibold text-lg">Отсканируйте QR код</h3>
                      <p className="text-sm text-muted-foreground">
                        Откройте WhatsApp на телефоне → Настройки → Связанные устройства → Связать устройство
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <img 
                        src={whatsappQR} 
                        alt="WhatsApp QR Code" 
                        className="w-64 h-64"
                        key={whatsappQR}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">QR код от Whapi.Cloud</p>
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



                {/* Информация */}
                <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t">
                  <p><strong>Как это работает (Whapi.Cloud):</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Зарегистрируйтесь на <a href="https://whapi.cloud" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">whapi.cloud</a></li>
                    <li>Получите API токен в личном кабинете</li>
                    <li>Введите токен в поле выше и сохраните</li>
                    <li>Настройте webhook для получения входящих сообщений</li>
                    <li>Подключите WhatsApp через панель управления Whapi.Cloud</li>
                    <li>Начните отправлять и получать сообщения!</li>
                  </ul>
                  <p className="text-xs mt-2">
                    <strong>Преимущества Whapi.Cloud:</strong> Стабильное подключение, облачная инфраструктура, 
                    отсутствие проблем с браузером и Puppeteer.
                  </p>
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

          {/* OpenAI настройки */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5" />
                    <span>OpenAI ИИ Ассистент</span>
                  </CardTitle>
                  <CardDescription>
                    Настройте OpenAI API для генерации персонализированных сообщений поставщикам
                  </CardDescription>
                </div>
                <Badge variant={hasOpenaiSettings ? "default" : "secondary"}>
                  {hasOpenaiSettings ? "Настроен" : "Не настроен"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Key настройка */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-lg">API Ключ OpenAI</h3>
                <p className="text-sm text-muted-foreground">
                  Получите API ключ на <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com</a>
                </p>
                
                {hasOpenaiSettings && maskedOpenaiKey ? (
                  <div className="space-y-2">
                    <Label>Текущий API ключ</Label>
                    <div className="flex items-center space-x-2">
                      <Input 
                        value={maskedOpenaiKey} 
                        disabled 
                        className="font-mono text-sm"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={loadOpenaiSettings}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="openai-api-key">
                    {hasOpenaiSettings ? 'Новый API ключ' : 'API ключ OpenAI'}
                  </Label>
                  <Input
                    id="openai-api-key"
                    type="password"
                    placeholder="sk-..."
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assistant-id">ID Ассистента</Label>
                  <Input
                    id="assistant-id"
                    placeholder="asst_..."
                    value={openaiAssistantId}
                    onChange={(e) => setOpenaiAssistantId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Создайте ассистента в <a href="https://platform.openai.com/assistants" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Playground</a>
                  </p>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    onClick={saveOpenaiSettings}
                    disabled={openaiSaving || !openaiApiKey.trim() || !openaiAssistantId.trim()}
                  >
                    {openaiSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Сохранить настройки
                      </>
                    )}
                  </Button>
                  
                  {hasOpenaiSettings && (
                    <Button 
                      variant="outline"
                      onClick={deleteOpenaiSettings}
                      disabled={openaiSaving}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Удалить
                    </Button>
                  )}
                </div>
              </div>

              {/* Инструкции */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Как настроить:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Зарегистрируйтесь на <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></li>
                  <li>Создайте API ключ в разделе "API Keys"</li>
                  <li>Создайте ассистента в "Assistants" с инструкциями для генерации сообщений</li>
                  <li>Скопируйте ID ассистента и вставьте выше</li>
                </ol>
              </div>
            </CardContent>
          </Card>

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
                  <Label htmlFor="suppliers-count">
                    <Brain className="inline h-4 w-4 mr-1" />
                    Количество поставщиков для ИИ выбора (1-10)
                  </Label>
                  <Input
                    id="suppliers-count"
                    type="number"
                    min="1"
                    max="10"
                    value={suppliersToContact}
                    onChange={(e) => setSuppliersToContact(Math.max(1, Math.min(10, parseInt(e.target.value) || 3)))}
                  />
                  <p className="text-xs text-muted-foreground">
                    ИИ выберет лучших поставщиков из найденных для отправки запросов КП
                  </p>
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

              <Button 
                onClick={saveSystemSettings}
                disabled={systemSettingsSaving}
              >
                {systemSettingsSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Сохранить общие настройки
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
