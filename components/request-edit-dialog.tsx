// Диалог редактирования заявки
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Edit, Loader2, CheckCircle, X, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

interface Position {
  id?: string
  name: string
  description: string
  quantity: number
  unit: string
}

interface RequestEditDialogProps {
  requestId: string
  initialData?: any
}

export function RequestEditDialog({ requestId, initialData }: RequestEditDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Поля заявки
  const [requestNumber, setRequestNumber] = useState("")
  const [description, setDescription] = useState("")
  const [deadline, setDeadline] = useState("")
  const [budget, setBudget] = useState("")
  const [currency, setCurrency] = useState("KZT")
  const [priority, setPriority] = useState("1")
  const [status, setStatus] = useState("UPLOADED")
  const [searchRegion, setSearchRegion] = useState("KAZAKHSTAN")
  const [positions, setPositions] = useState<Position[]>([])

  // Загружаем данные при открытии
  useEffect(() => {
    if (open && initialData) {
      setRequestNumber(initialData.requestNumber || "")
      setDescription(initialData.description || "")
      setDeadline(
        initialData.deadline
          ? new Date(initialData.deadline).toISOString().split("T")[0]
          : ""
      )
      setBudget(initialData.budget?.toString() || "")
      setCurrency(initialData.currency || "KZT")
      setPriority(initialData.priority?.toString() || "1")
      setStatus(initialData.status || "UPLOADED")
      setSearchRegion(initialData.searchRegion || "KAZAKHSTAN")
      setPositions(
        initialData.positions?.map((p: any) => ({
          id: p.id,
          name: p.name || "",
          description: p.description || "",
          quantity: p.quantity || 1,
          unit: p.unit || "шт",
        })) || [{ id: undefined, name: "", description: "", quantity: 1, unit: "шт" }]
      )
    }
  }, [open, initialData])

  const addPosition = () => {
    setPositions([
      ...positions,
      {
        id: undefined,
        name: "",
        description: "",
        quantity: 1,
        unit: "шт",
      },
    ])
  }

  const removePosition = (index: number) => {
    if (positions.length > 1) {
      setPositions(positions.filter((_, i) => i !== index))
    }
  }

  const updatePosition = (index: number, field: keyof Position, value: any) => {
    setPositions(
      positions.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    )
  }

  const handleSubmit = async () => {
    // Валидация
    if (!requestNumber.trim()) {
      setError("Введите номер заявки")
      return
    }
    if (!deadline) {
      setError("Укажите срок выполнения")
      return
    }
    if (positions.some((p) => !p.name.trim())) {
      setError("Заполните названия всех позиций")
      return
    }
    if (positions.some((p) => p.quantity <= 0)) {
      setError("Количество должно быть больше 0")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          requestNumber: requestNumber.trim(),
          description: description.trim() || `Заявка ${requestNumber}`,
          deadline,
          budget: budget ? parseFloat(budget) : null,
          currency,
          priority: parseInt(priority),
          status,
          searchRegion,
          positions: positions.map((p) => ({
            id: p.id,
            name: p.name.trim(),
            description: p.description.trim() || p.name.trim(),
            quantity: p.quantity,
            unit: p.unit,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Ошибка при обновлении заявки")
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)

      // Через 1 секунду закрываем и обновляем
      setTimeout(() => {
        setOpen(false)
        router.refresh()
      }, 1000)
    } catch (err) {
      console.error("Update request error:", err)
      setError("Ошибка соединения с сервером")
      setLoading(false)
    }
  }

  const resetForm = () => {
    setError("")
    setSuccess(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen)
        if (!newOpen) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="mr-2 h-4 w-4" />
          Редактировать
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактирование заявки {requestId}</DialogTitle>
          <DialogDescription>
            Внесите изменения в заявку. Все поля можно редактировать.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Основные поля */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requestNumber">
                Номер заявки <span className="text-red-500">*</span>
              </Label>
              <Input
                id="requestNumber"
                placeholder="REQ-001"
                value={requestNumber}
                onChange={(e) => setRequestNumber(e.target.value)}
                disabled={loading || success}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">
                Срок выполнения <span className="text-red-500">*</span>
              </Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={loading || success}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              placeholder="Краткое описание заявки..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading || success}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Бюджет</Label>
              <Input
                id="budget"
                type="number"
                placeholder="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                disabled={loading || success}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Валюта</Label>
              <Select
                value={currency}
                onValueChange={setCurrency}
                disabled={loading || success}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KZT">KZT (тенге)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="RUB">RUB (₽)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Приоритет</Label>
              <Select
                value={priority}
                onValueChange={setPriority}
                disabled={loading || success}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Низкий</SelectItem>
                  <SelectItem value="1">Средний</SelectItem>
                  <SelectItem value="2">Высокий</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Статус</Label>
              <Select
                value={status}
                onValueChange={setStatus}
                disabled={loading || success}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPLOADED">Новая</SelectItem>
                  <SelectItem value="SEARCHING">Поиск поставщиков</SelectItem>
                  <SelectItem value="PENDING_QUOTES">Ожидание КП</SelectItem>
                  <SelectItem value="COMPARING">Сравнение предложений</SelectItem>
                  <SelectItem value="APPROVED">Согласована</SelectItem>
                  <SelectItem value="REJECTED">Отклонена</SelectItem>
                  <SelectItem value="COMPLETED">Завершена</SelectItem>
                  <SelectItem value="ARCHIVED">Архив</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Регион поиска */}
          <div className="space-y-2">
            <Label htmlFor="searchRegion">Регион поиска поставщиков</Label>
            <Select
              value={searchRegion}
              onValueChange={setSearchRegion}
              disabled={loading || success}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KAZAKHSTAN">🇰🇿 Только Казахстан</SelectItem>
                <SelectItem value="CIS">🌍 СНГ (включая Россию)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Позиции */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Позиции <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPosition}
                disabled={loading || success}
                className="bg-transparent"
              >
                <Plus className="h-4 w-4 mr-1" />
                Добавить позицию
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
              {positions.map((position, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-start border-b pb-2 last:border-0"
                >
                  <div className="col-span-4">
                    <Input
                      placeholder="Наименование"
                      value={position.name}
                      onChange={(e) =>
                        updatePosition(index, "name", e.target.value)
                      }
                      disabled={loading || success}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      placeholder="Описание"
                      value={position.description}
                      onChange={(e) =>
                        updatePosition(index, "description", e.target.value)
                      }
                      disabled={loading || success}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Кол-во"
                      value={position.quantity}
                      onChange={(e) =>
                        updatePosition(
                          index,
                          "quantity",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={loading || success}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      placeholder="Ед."
                      value={position.unit}
                      onChange={(e) =>
                        updatePosition(index, "unit", e.target.value)
                      }
                      disabled={loading || success}
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    {positions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePosition(index)}
                        disabled={loading || success}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ошибка */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Успех */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Заявка успешно обновлена!
              </AlertDescription>
            </Alert>
          )}

          {/* Кнопки */}
          <div className="flex space-x-2">
            <Button
              onClick={handleSubmit}
              disabled={loading || success}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Сохранено
                </>
              ) : (
                "Сохранить изменения"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading || success}
              className="bg-transparent"
            >
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

