"use client"

import { Inter } from "next/font/google"
import "./globals.css"
import { Navigation } from "@/components/navigation"
import { Building2, LogOut, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"

const inter = Inter({ subsets: ["latin", "cyrillic"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <html lang="ru">
      <body className={inter.className}>
        {/* Desktop Navigation */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
          <div className="flex flex-col flex-grow pt-5 bg-background border-r border-border overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold">TOO Alex</span>
            </div>
            <div className="mt-8 flex-grow flex flex-col">
              <nav className="flex-1 px-2 space-y-1">
                <Navigation />
              </nav>
              <div className="flex-shrink-0 p-4 border-t border-border">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <LogOut className="mr-2 h-4 w-4" />
                  Выход
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                <div className="flex items-center mb-8">
                  <Building2 className="h-8 w-8 text-primary" />
                  <span className="ml-2 text-xl font-bold">TOO Alex</span>
                </div>
                <nav className="space-y-1">
                  <Navigation />
                </nav>
                <div className="absolute bottom-4 left-4 right-4">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
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
      </body>
    </html>
  )
}
