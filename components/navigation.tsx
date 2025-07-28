"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Search,
  MessageSquare,
  BarChart,
  Settings,
  FileText,
  Building2,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react"

const navigation = [
  {
    name: "Дашборд",
    href: "/dashboard",
    icon: LayoutDashboard
  },
  {
    name: "Заявки",
    href: "/requests",
    icon: FileText
  },
  {
    name: "Поиск",
    href: "/search-process",
    icon: Search
  },
  {
    name: "Чаты",
    href: "/chats",
    icon: MessageSquare
  },
  {
    name: "AI Анализ",
    href: "/ai-analysis",
    icon: BarChart
  },
  {
    name: "Поставщики",
    href: "/suppliers",
    icon: Building2
  },
  {
    name: "Аудит",
    href: "/audit",
    icon: ShieldCheck
  },
  {
    name: "Настройки",
    href: "/settings",
    icon: Settings
  }
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col space-y-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
              isActive 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}
