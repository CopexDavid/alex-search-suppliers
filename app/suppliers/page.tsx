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
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
// import { useToast } from "@/hooks/use-toast" // Не используется в проекте
import { Plus, Edit, Trash2, Search, History, Phone, Mail, Star, Globe, MessageSquare, Loader2, ChevronLeft, ChevronRight } from "lucide-react"

// Типы данных
interface Supplier {
  id: string
  name: string
  inn?: string
  address?: string
  email?: string
  phone?: string
  whatsapp?: string
  website?: string
  description?: string
  rating: number
  contractValidTo?: string
  tags: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    quotes: number
    requests: number
  }
}

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("все")
  const [contractFilter, setContractFilter] = useState("все")
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalSuppliers, setTotalSuppliers] = useState(0)
  const suppliersPerPage = 25
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    inn: "",
    address: "",
    email: "",
    phone: "",
    whatsapp: "",
    website: "",
    description: "",
    tags: null,
    contractValidTo: "",
  })
  // const { toast } = useToast() // Заменено на alert()

  // Загрузка поставщиков
  const fetchSuppliers = async (page: number = currentPage) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (categoryFilter !== 'все') params.append('category', categoryFilter)
      if (contractFilter !== 'все') params.append('hasContract', contractFilter)
      params.append('limit', suppliersPerPage.toString())
      params.append('offset', ((page - 1) * suppliersPerPage).toString())
      
      const response = await fetch(`/api/suppliers?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setSuppliers(data.data)
        setCategories(data.categories || [])
        setTotalSuppliers(data.pagination?.total || 0)
        setTotalPages(Math.ceil((data.pagination?.total || 0) / suppliersPerPage))
        setCurrentPage(page)
      } else {
        alert(`Ошибка: ${data.error || "Не удалось загрузить поставщиков"}`)
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      alert("Ошибка: Не удалось загрузить поставщиков")
    } finally {
      setLoading(false)
    }
  }

  // Загрузка при монтировании и изменении фильтров
  useEffect(() => {
    fetchSuppliers(1) // Сбрасываем на первую страницу при изменении фильтров
  }, [searchTerm, categoryFilter, contractFilter])

  // Функции пагинации
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchSuppliers(page)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1)
    }
  }

  // Функция для определения статуса договора
  const getContractStatus = (contractValidTo?: string) => {
    if (!contractValidTo) return { hasContract: false, isExpired: false }
    
    const contractDate = new Date(contractValidTo)
    const now = new Date()
    
    return {
      hasContract: true,
      isExpired: contractDate < now
    }
  }

  // Сброс фильтров
  const resetFilters = () => {
    setSearchTerm("")
    setCategoryFilter("все")
    setContractFilter("все")
  }

  // Создание поставщика
  const handleCreateSupplier = async () => {
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert("✅ Поставщик успешно создан")
        setIsAddDialogOpen(false)
        setFormData({
          name: "",
          inn: "",
          address: "",
          email: "",
          phone: "",
          whatsapp: "",
          website: "",
          description: "",
          tags: null,
          contractValidTo: "",
        })
        fetchSuppliers()
      } else {
        alert(`❌ Ошибка: ${data.error || "Не удалось создать поставщика"}`)
      }
    } catch (error) {
      console.error('Error creating supplier:', error)
      alert("❌ Ошибка: Не удалось создать поставщика")
    }
  }

  // Обновление поставщика
  const handleUpdateSupplier = async () => {
    if (!editingSupplier) return
    
    try {
      const response = await fetch(`/api/suppliers/${editingSupplier.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert("✅ Поставщик успешно обновлен")
        setIsEditDialogOpen(false)
        setEditingSupplier(null)
        fetchSuppliers()
      } else {
        alert(`❌ Ошибка: ${data.error || "Не удалось обновить поставщика"}`)
      }
    } catch (error) {
      console.error('Error updating supplier:', error)
      alert("❌ Ошибка: Не удалось обновить поставщика")
    }
  }

  // Удаление поставщика
  const handleDeleteSupplier = async (supplier: Supplier) => {
    if (!confirm(`Вы уверены, что хотите удалить поставщика "${supplier.name}"?`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`✅ ${data.message || "Поставщик удален"}`)
        fetchSuppliers()
      } else {
        alert(`❌ Ошибка: ${data.error || "Не удалось удалить поставщика"}`)
      }
    } catch (error) {
      console.error('Error deleting supplier:', error)
      alert("❌ Ошибка: Не удалось удалить поставщика")
    }
  }

  // Открытие диалога редактирования
  const openEditDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      inn: supplier.inn || "",
      address: supplier.address || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      whatsapp: supplier.whatsapp || "",
      website: supplier.website || "",
      description: supplier.description || "",
      tags: supplier.tags,
      contractValidTo: supplier.contractValidTo ? supplier.contractValidTo.split('T')[0] : "",
    })
    setIsEditDialogOpen(true)
  }

  // Компонент формы поставщика
  const SupplierForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Название компании *</Label>
          <Input 
            placeholder="ТОО Название компании" 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>ИНН</Label>
          <Input 
            placeholder="123456789012" 
            value={formData.inn}
            onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Адрес</Label>
        <Input 
          placeholder="г. Алматы, ул. Абая 150" 
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Телефон</Label>
          <Input 
            placeholder="+7 777 123 4567" 
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp</Label>
          <Input 
            placeholder="+7 777 123 4567" 
            value={formData.whatsapp}
            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input 
            type="email" 
            placeholder="info@company.kz" 
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Веб-сайт</Label>
          <Input 
            placeholder="https://company.kz" 
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Описание</Label>
        <Textarea 
          placeholder="Краткое описание деятельности поставщика" 
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Теги (через запятую)</Label>
        <Input 
          placeholder="канцелярские товары, офисная мебель" 
          value={formData.tags || ''}
          onChange={(e) => setFormData({ 
            ...formData, 
            tags: e.target.value.trim() || null
          })}
        />
      </div>

      <div className="space-y-2">
        <Label>Договор действует до</Label>
        <Input 
          type="date" 
          value={formData.contractValidTo}
          onChange={(e) => setFormData({ ...formData, contractValidTo: e.target.value })}
        />
      </div>

      <Button 
        className="w-full" 
        onClick={isEdit ? handleUpdateSupplier : handleCreateSupplier}
        disabled={!formData.name.trim()}
      >
        {isEdit ? "Сохранить изменения" : "Создать поставщика"}
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">База поставщиков</h1>
          <p className="text-muted-foreground mt-1">
            Всего поставщиков: {totalSuppliers} | Страница {currentPage} из {totalPages}
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить поставщика
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Добавить поставщика</DialogTitle>
              <DialogDescription>Заполните информацию о новом поставщике</DialogDescription>
            </DialogHeader>
            <SupplierForm />
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
                placeholder="Название, email, телефон..."
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
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
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
              <Button variant="outline" className="w-full bg-transparent" onClick={resetFilters}>
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
          <CardDescription>
            {loading ? "Загрузка..." : `Найдено поставщиков: ${suppliers.length}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Загрузка поставщиков...</span>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Поставщики не найдены</p>
              <p className="text-sm mt-1">Попробуйте изменить фильтры или добавить нового поставщика</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Категории</TableHead>
                  <TableHead>Контакты</TableHead>
                  <TableHead>Рейтинг</TableHead>
                  <TableHead>Договор</TableHead>
                  <TableHead>Статистика</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => {
                  const contractStatus = getContractStatus(supplier.contractValidTo)
                  return (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{supplier.name}</div>
                          {supplier.inn && (
                            <div className="text-sm text-muted-foreground">ИНН: {supplier.inn}</div>
                          )}
                          {supplier.address && (
                            <div className="text-sm text-muted-foreground">{supplier.address}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {supplier.tags ? (
                            <Badge variant="secondary" className="text-xs">
                              {supplier.tags}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Нет категорий</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {supplier.phone && (
                            <div className="flex items-center">
                              <Phone className="mr-1 h-3 w-3" />
                              <a 
                                href={`tel:${supplier.phone.replace(/\D/g, '')}`}
                                className="text-blue-600 hover:underline"
                              >
                                {supplier.phone}
                              </a>
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center">
                              <Mail className="mr-1 h-3 w-3" />
                              <a 
                                href={`mailto:${supplier.email}`}
                                className="text-blue-600 hover:underline"
                              >
                                {supplier.email}
                              </a>
                            </div>
                          )}
                          {supplier.whatsapp && (
                            <div className="flex items-center">
                              <MessageSquare className="mr-1 h-3 w-3" />
                              <a 
                                href={supplier.whatsapp.startsWith('http') ? supplier.whatsapp : `https://wa.me/${supplier.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:underline"
                              >
                                {supplier.whatsapp.replace(/\D/g, '').replace(/^(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})$/, '+$1 ($2) $3-$4-$5')}
                              </a>
                            </div>
                          )}
                          {supplier.website && (
                            <div className="flex items-center">
                              <Globe className="mr-1 h-3 w-3" />
                              <a 
                                href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline truncate max-w-[150px]"
                                title={supplier.website}
                              >
                                {supplier.website.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="mr-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{supplier.rating.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {contractStatus.hasContract ? (
                          <Badge 
                            variant={contractStatus.isExpired ? "destructive" : "outline"}
                          >
                            {contractStatus.isExpired ? "Договор истек" : "Есть договор"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Нет договора</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>КП: {supplier._count.quotes}</div>
                          <div>Заявки: {supplier._count.requests}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(supplier)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Изменить
                          </Button>

                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700 bg-transparent"
                            onClick={() => handleDeleteSupplier(supplier)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground">
              Показано {((currentPage - 1) * suppliersPerPage) + 1} - {Math.min(currentPage * suppliersPerPage, totalSuppliers)} из {totalSuppliers} поставщиков
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Предыдущая
            </Button>
            
            <div className="flex items-center space-x-1">
              {/* Показываем первую страницу */}
              {currentPage > 3 && (
                <>
                  <Button
                    variant={1 === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(1)}
                  >
                    1
                  </Button>
                  {currentPage > 4 && <span className="px-2">...</span>}
                </>
              )}
              
              {/* Показываем страницы вокруг текущей */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                if (page > totalPages) return null
                
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                )
              })}
              
              {/* Показываем последнюю страницу */}
              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && <span className="px-2">...</span>}
                  <Button
                    variant={totalPages === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Следующая
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Диалог редактирования */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать поставщика</DialogTitle>
            <DialogDescription>
              Измените информацию о поставщике {editingSupplier?.name}
            </DialogDescription>
          </DialogHeader>
          <SupplierForm isEdit />
        </DialogContent>
      </Dialog>
    </div>
  )
}
