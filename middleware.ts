// Middleware для защиты маршрутов и проверки авторизации
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyTokenEdge } from '@/lib/auth-edge'

// Публичные маршруты, не требующие авторизации
const publicRoutes = ['/login', '/api/auth/login']

// Маршруты только для неавторизованных пользователей
const authRoutes = ['/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth_token')?.value

  // Все API маршруты обрабатывают авторизацию сами через requireAuth()
  // Пропускаем их здесь, чтобы не было редиректов
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    // Добавляем CORS заголовки для API
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return response
  }

  // Статические файлы Next.js
  if (pathname.startsWith('/_next/') || pathname.startsWith('/static/')) {
    const response = NextResponse.next()
    // Добавляем заголовки для статических файлов
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    return response
  }

  // Проверяем, является ли маршрут публичным
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Если есть токен, проверяем его валидность
  if (token) {
    const payload = await verifyTokenEdge(token)
    
    // Если токен невалидный, удаляем его и перенаправляем на логин
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth_token')
      return response
    }

    // Если пользователь авторизован и пытается попасть на страницу логина
    if (isAuthRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Пользователь авторизован, продолжаем
    const response = NextResponse.next()
    // Добавляем безопасные заголовки
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
    return response
  }

  // Если нет токена и маршрут не публичный, перенаправляем на логин
  if (!isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    // Сохраняем URL для редиректа после логина
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next()
  // Добавляем безопасные заголовки для публичных страниц
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}


