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
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit, Trash2, Search, History, Phone, Mail } from "lucide-react"

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("все")
  const [contractFilter, setContractFilter] = useState("все")

  const suppliers = [
    {
      id: 1,
      name: "ТОО Канцтовары Плюс",
      category: "Канцелярские товары",
      hasContract: true,
      phone: "+7 777 123 4567",
      email: "info@kanctovary.kz",
      whatsapp: "+7 777 123 4567",
    },
    {
      id: 2,
      name: "ИП Техносервис",
      category: "Компьютерная техника",
      hasContract: false,
      phone: "+7 777 234 5678",
      email: "tech@service.kz",
      whatsapp: "+7 777 234 5678",
    },
    {
      id: 3,
      name: "ООО Офис Мебель",
      category: "Мебель",
      hasContract: true,
      phone: "+7 777 345 6789",
      email: "sales@office-mebel.kz",
      whatsapp: "+7 777 345 6789",
    },
    {
      id: 4,
      name: "ТОО СтройМатериалы КЗ",
      category: "Строительные материалы",
      hasContract: false,
      phone: "+7 777 456 7890",
      email: "order@stroymaterials.kz",
      whatsapp: "+7 777 456 7890",
    },
  ]

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "все" || supplier.category === categoryFilter
    const matchesContract =
      contractFilter === "все" ||
      (contractFilter === "с договором" && supplier.hasContract) ||
      (contractFilter === "без договора" && !supplier.hasContract)

    return matchesSearch && matchesCategory && matchesContract
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">База поставщиков</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить поставщика
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить поставщика</DialogTitle>
              <DialogDescription>Заполните информацию о новом поставщике</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Название компании</Label>
                <Input placeholder="ТОО Название компании" />
              </div>

              <div className="space-y-2">
                <Label>Категория товаров</Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input placeholder="+7 777 123 4567" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input placeholder="+7 777 123 4567" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="info@company.kz" />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="contract" />
                <Label htmlFor="contract">Есть договор</Label>
              </div>

              <Button className="w-full">Сохранить</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Фильтры и поиск */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5" />
            Поиск и фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Поиск</Label>
              <Input
                placeholder="Название или email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="все">Все категории</SelectItem>
                  <SelectItem value="Канцелярские товары">Канцелярские товары</SelectItem>
                  <SelectItem value="Компьютерная техника">Компьютерная техника</SelectItem>
                  <SelectItem value="Мебель">Мебель</SelectItem>
                  <SelectItem value="Строительные материалы">Строительные материалы</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Договор</Label>
              <Select value={contractFilter} onValueChange={setContractFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="все">Все</SelectItem>
                  <SelectItem value="с договором">С договором</SelectItem>
                  <SelectItem value="без договора">Без договора</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full bg-transparent">
                Сбросить фильтры
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Таблица поставщиков */}
      <Card>
        <CardHeader>
          <CardTitle>Список поставщиков</CardTitle>
          <CardDescription>Найдено поставщиков: {filteredSuppliers.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Контакты</TableHead>
                <TableHead>Договор</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.category}</TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center">
                        <Phone className="mr-1 h-3 w-3" />
                        {supplier.phone}
                      </div>
                      <div className="flex items-center">
                        <Mail className="mr-1 h-3 w-3" />
                        {supplier.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.hasContract ? (
                      <Badge variant="outline">Есть договор</Badge>
                    ) : (
                      <Badge variant="secondary">Нет договора</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <History className="mr-2 h-4 w-4" />
                        История
                      </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Edit className="mr-2 h-4 w-4" />
                            Изменить
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Редактировать поставщика</DialogTitle>
                            <DialogDescription>Измените информацию о поставщике</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Название компании</Label>
                              <Input defaultValue={supplier.name} />
                            </div>

                            <div className="space-y-2">
                              <Label>Категория товаров</Label>
                              <Select defaultValue={supplier.category}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Канцелярские товары">Канцелярские товары</SelectItem>
                                  <SelectItem value="Компьютерная техника">Компьютерная техника</SelectItem>
                                  <SelectItem value="Мебель">Мебель</SelectItem>
                                  <SelectItem value="Строительные материалы">Строительные материалы</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Телефон</Label>
                                <Input defaultValue={supplier.phone} />
                              </div>
                              <div className="space-y-2">
                                <Label>WhatsApp</Label>
                                <Input defaultValue={supplier.whatsapp} />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Email</Label>
                              <Input defaultValue={supplier.email} />
                            </div>

                            <div className="flex items-center space-x-2">
                              <Checkbox id="contract-edit" defaultChecked={supplier.hasContract} />
                              <Label htmlFor="contract-edit">Есть договор</Label>
                            </div>

                            <Button className="w-full">Сохранить изменения</Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
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
    </div>
  )
}
