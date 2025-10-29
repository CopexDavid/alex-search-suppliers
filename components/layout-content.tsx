// Компонент для управления layout с авторизацией
"use client"

import { usePathname } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Building2, LogOut, Menu, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { getRoleLabel } from "@/lib/rbac"

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout, isAuthenticated } = useAuth()

  // Страницы без навигации (логин и т.д.)
  const isAuthPage = pathname === '/login'

  if (isAuthPage) {
    return <>{children}</>
  }

  // Если не авторизован, показываем только контент (middleware перенаправит на логин)
  if (!isAuthenticated) {
    return <>{children}</>
  }

  const getUserInitials = () => {
    if (!user) return "?"
    return user.name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow pt-5 bg-background border-r border-border overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="ml-2 text-xl font-bold">TOO Alex</span>
          </div>
          
          {/* User Info */}
          {user && (
            <div className="mt-6 px-4 pb-4 border-b border-border">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{getRoleLabel(user.role)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              <Navigation />
            </nav>
            <div className="flex-shrink-0 p-4 border-t border-border">
              <Button 
                variant="outline" 
                className="w-full justify-start bg-transparent"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Выход
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="flex items-center">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="ml-2 text-lg font-bold">TOO Alex</span>
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <div className="flex items-center mb-6">
                <Building2 className="h-8 w-8 text-primary" />
                <span className="ml-2 text-xl font-bold">TOO Alex</span>
              </div>

              {/* User Info Mobile */}
              {user && (
                <div className="mb-6 pb-4 border-b border-border">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{getRoleLabel(user.role)}</p>
                    </div>
                  </div>
                </div>
              )}

              <nav className="space-y-1">
                <Navigation />
              </nav>
              <div className="absolute bottom-4 left-4 right-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-transparent"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Выход
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:pl-64">
        <main className="p-8">{children}</main>
      </div>
    </>
  )
}

