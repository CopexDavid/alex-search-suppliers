"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Send, Eye, Check, Filter, FileText, MessageSquare } from "lucide-react"
import Link from "next/link"

export default function RequestsPage() {
  const [statusFilter, setStatusFilter] = useState("все")
  const [dateFilter, setDateFilter] = useState("")

  const requests = [
    {
      id: "REQ-001",
      date: "2024-01-15",
      category: "Канцелярские товары",
      status: "новая",
      description: "Закупка офисных принадлежностей",
    },
    {
      id: "REQ-002",
      date: "2024-01-14",
      category: "Компьютерная техника",
      status: "в обработке",
      description: "Покупка ноутбуков для отдела",
    },
    {
      id: "REQ-003",
      date: "2024-01-13",
      category: "Мебель",
      status: "на согласовании",
      description: "Офисная мебель для нового офиса",
    },
  ]

  const suppliers = [
    { id: 1, name: "ТОО Канцтовары Плюс" },
    { id: 2, name: "ИП Техносервис" },
    { id: 3, name: "ООО Офис Мебель" },
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
        <h1 className="text-3xl font-bold">Управление заявками</h1>
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="все">Все статусы</SelectItem>
                  <SelectItem value="новая">Новая</SelectItem>
                  <SelectItem value="в обработке">В обработке</SelectItem>
                  <SelectItem value="на согласовании">На согласовании</SelectItem>
                  <SelectItem value="завершена">Завершена</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Дата</Label>
              <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Категория</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="канцелярские">Канцелярские товары</SelectItem>
                  <SelectItem value="техника">Компьютерная техника</SelectItem>
                  <SelectItem value="мебель">Мебель</SelectItem>
                  <SelectItem value="строительные">Строительные материалы</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Таблица заявок */}
      <Card>
        <CardHeader>
          <CardTitle>Список заявок</CardTitle>
          <CardDescription>Все заявки в системе с возможностью управления</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.id}</TableCell>
                  <TableCell>{request.date}</TableCell>
                  <TableCell>{request.category}</TableCell>
                  <TableCell>{request.description}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {/* Отправить поставщикам */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Send className="mr-2 h-4 w-4" />
                            Отправить
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Отправка заявки поставщикам</DialogTitle>
                            <DialogDescription>
                              Выберите поставщиков и отправьте заявку через WhatsApp
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Поставщики</Label>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Выберите поставщиков" />
                                </SelectTrigger>
                                <SelectContent>
                                  {suppliers.map((supplier) => (
                                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                      {supplier.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Сообщение</Label>
                              <Textarea
                                placeholder="Добрый день! Просим предоставить коммерческое предложение..."
                                rows={4}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Прикрепить файл</Label>
                              <Input type="file" accept=".pdf,.doc,.docx" />
                            </div>

                            <Button className="w-full">
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Отправить через WhatsApp
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Просмотр ответов */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/requests/${request.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Подробнее
                            </Link>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Ответы поставщиков</DialogTitle>
                            <DialogDescription>Полученные предложения от поставщиков</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="border rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium">ТОО Канцтовары Плюс</h4>
                                <Badge>Получено</Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Цена:</span>
                                  <p className="font-medium">150,000 тг</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Срок:</span>
                                  <p className="font-medium">3-5 дней</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Условия:</span>
                                  <p className="font-medium">Предоплата 50%</p>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                                <FileText className="mr-2 h-4 w-4" />
                                Скачать PDF
                              </Button>
                            </div>

                            <Button className="w-full">Сравнить предложения</Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Согласование */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Check className="mr-2 h-4 w-4" />
                            Согласовать
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Согласование заявки</DialogTitle>
                            <DialogDescription>Итоговое предложение для согласования</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="border rounded-lg p-4">
                              <h4 className="font-medium mb-2">Выбранное предложение</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Поставщик:</span>
                                  <p className="font-medium">ТОО Канцтовары Плюс</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Сумма:</span>
                                  <p className="font-medium">150,000 тг</p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Комментарий</Label>
                              <Textarea placeholder="Дополнительные комментарии..." />
                            </div>

                            <div className="flex space-x-2">
                              <Button className="flex-1">Подтвердить</Button>
                              <Button variant="outline" className="flex-1 bg-transparent">
                                Отклонить
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
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
