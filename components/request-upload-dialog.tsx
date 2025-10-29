// Диалог загрузки файла заявки
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
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, Loader2, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export function RequestUploadDialog() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [open, setOpen] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError("")
      setSuccess(false)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Пожалуйста, выберите файл")
      return
    }

    setLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/requests/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Ошибка при загрузке файла")
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)

      // Через 1.5 секунды закрываем диалог и перенаправляем на заявку
      setTimeout(() => {
        setOpen(false)
        router.push(`/requests/${data.data.id}`)
        router.refresh()
      }, 1500)
    } catch (err) {
      console.error("Upload error:", err)
      setError("Ошибка соединения с сервером")
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Загрузить из файла
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Импорт заявки из файла</DialogTitle>
          <DialogDescription>
            Загрузите Excel файл заявки из 1С (.xlsx, .xls)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Область выбора файла */}
          <div className="space-y-2">
            <Label htmlFor="file">Файл заявки</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading || success}
              />
            </div>
            {file && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                <span>{file.name}</span>
                <span className="text-xs">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
          </div>

          {/* Подсказка */}
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Формат файла:</strong> Excel файл "Заявка на потребность"
              из 1С. Система автоматически извлечет номер заявки, дату, позиции
              и другие данные.
            </AlertDescription>
          </Alert>

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
                Заявка успешно импортирована! Перенаправление...
              </AlertDescription>
            </Alert>
          )}

          {/* Кнопки */}
          <div className="flex space-x-2">
            <Button
              onClick={handleUpload}
              disabled={!file || loading || success}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Импорт...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Готово
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Импортировать
                </>
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

