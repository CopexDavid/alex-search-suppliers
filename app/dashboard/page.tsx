"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // Редирект на главную страницу, где теперь находится дашборд
    router.replace("/")
  }, [router])

  return null
}
