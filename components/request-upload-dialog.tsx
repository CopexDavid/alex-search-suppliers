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
import { Upload, FileSpreadsheet, Loader2, CheckCircle, CloudUpload } from "lucide-react"
import { useRouter } from "next/navigation"

export function RequestUploadDialog() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [open, setOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError("")
      setSuccess(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile)
      setError("")
      setSuccess(false)
    } else {
      setError("Пожалуйста, выберите Excel файл (.xlsx или .xls)")
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
            
            {/* Drag & Drop зона */}
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer
                ${isDragOver 
                  ? 'border-blue-400 bg-blue-50 scale-105' 
                  : file 
                    ? 'border-green-400 bg-green-50' 
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }
                ${loading || success ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !loading && !success && document.getElementById('file')?.click()}
            >
              <input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading || success}
                className="hidden"
              />
              
              {file ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2 text-green-600">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-sm font-medium">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{file.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                  <div className="text-xs text-green-600 font-medium">
                    Файл готов к загрузке
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-center">
                    <CloudUpload className={`h-12 w-12 transition-colors ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">
                      {isDragOver ? 'Отпустите файл здесь' : 'Перетащите файл сюда'}
                    </p>
                    <p className="text-xs text-gray-500">
                      или <span className="text-blue-600 font-medium">нажмите для выбора</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      Поддерживаются файлы .xlsx и .xls
                    </p>
                  </div>
                </div>
              )}
            </div>
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
              className={`
                flex-1 transition-all duration-200 
                ${success 
                  ? 'bg-green-600 hover:bg-green-700 border-green-600' 
                  : 'hover:scale-105 active:scale-95'
                }
              `}
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
              className="bg-transparent hover:bg-gray-50 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

