"use client"
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
import { Plus, Edit, Trash2, Users, FileText, Settings, Upload, MessageSquare } from "lucide-react"

export default function SettingsPage() {
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  WhatsApp интеграция
                </CardTitle>
                <CardDescription>Настройка отправки сообщений через WhatsApp</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>API токен</Label>
                  <Input type="password" placeholder="Введите токен WhatsApp API" />
                </div>

                <div className="space-y-2">
                  <Label>Номер телефона</Label>
                  <Input placeholder="+7 777 123 4567" />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="whatsapp-enabled" />
                  <Label htmlFor="whatsapp-enabled">Включить WhatsApp интеграцию</Label>
                </div>

                <Button className="w-full">Сохранить настройки WhatsApp</Button>
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
