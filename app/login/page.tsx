"use client"

import type React from "react"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2, RotateCcw } from "lucide-react"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/dashboard'

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Пожалуйста, заполните все поля")
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // ВАЖНО: для работы с cookies
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Ошибка при входе в систему')
        setLoading(false)
        return
      }

      // Успешный вход - перенаправляем
      window.location.href = redirectUrl
    } catch (err) {
      console.error('Login error:', err)
      setError('Ошибка соединения с сервером')
      setLoading(false)
    }
  }

  const handleResetForm = async () => {
    if (!confirm('Вы уверены, что хотите перезагрузить форму? Это очистит все данные и куки сайта.')) {
      return
    }

    setResetting(true)
    
    try {
      // Очищаем все куки для текущего домена
      document.cookie.split(";").forEach((cookie) => {
        const eqPos = cookie.indexOf("=")
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
        // Удаляем куки для разных путей и доменов
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`
      })

      // Очищаем localStorage и sessionStorage
      localStorage.clear()
      sessionStorage.clear()

      // Сбрасываем состояние формы
      setEmail("")
      setPassword("")
      setError("")
      setShowPassword(false)

      // Показываем сообщение об успехе
      alert('Форма успешно перезагружена, все данные очищены!')
      
      // Перезагружаем страницу для полной очистки
      window.location.reload()
    } catch (err) {
      console.error('Reset error:', err)
      setError('Ошибка при перезагрузке формы')
    } finally {
      setResetting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="example@alex.kz"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Пароль</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Введите пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            disabled={loading}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Вход...
          </>
        ) : (
          'Войти'
        )}
      </Button>

      <div className="text-center space-y-2">
        <Button
          variant="link"
          className="text-sm"
          type="button"
          disabled={loading || resetting}
          onClick={() => router.push('/reset-password')}
        >
          Забыли пароль?
        </Button>
        
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={loading || resetting}
            onClick={handleResetForm}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            {resetting ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Перезагрузка...
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-3 w-3" />
                Перезагрузить форму
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">TOO Alex</CardTitle>
          <CardDescription>Войдите в систему управления заявками</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
