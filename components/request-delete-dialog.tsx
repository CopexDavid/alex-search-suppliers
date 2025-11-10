// Диалог удаления заявки с подтверждением пароля
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, Loader2, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

interface RequestDeleteDialogProps {
  requestId: string
  requestNumber: string
  onDeleted?: () => void // Callback для обновления списка
}

export function RequestDeleteDialog({ requestId, requestNumber, onDeleted }: RequestDeleteDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleDelete = async () => {
    if (!password.trim()) {
      setError("Введите пароль")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/requests/${requestId}/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          password: password.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        console.log(`✅ Заявка ${requestNumber} удалена`)
        setOpen(false)
        
        // Если есть callback, вызываем его (для обновления списка)
        if (onDeleted) {
          onDeleted()
        } else {
          // Иначе перенаправляем на список заявок
          router.push('/requests')
          router.refresh()
        }
      } else {
        setError(data.error || 'Ошибка удаления заявки')
      }
    } catch (err) {
      console.error('Delete request error:', err)
      setError('Не удалось удалить заявку')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setPassword("")
    setError("")
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
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Удалить
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Удаление заявки
          </DialogTitle>
          <DialogDescription>
            Вы собираетесь <strong>безвозвратно удалить</strong> заявку <strong>{requestNumber}</strong> 
            и все связанные с ней данные (позиции, КП, чаты, сообщения).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Внимание!</strong> Это действие нельзя отменить. Все данные будут удалены навсегда.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="password">
              Введите ваш пароль для подтверждения <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Ваш пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleDelete()
                }
              }}
            />
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || !password.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Удаление...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить навсегда
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
