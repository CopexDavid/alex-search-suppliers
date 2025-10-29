import { Inter } from "next/font/google"
import "./globals.css"
import { LayoutContent } from "@/components/layout-content"

const inter = Inter({ subsets: ["latin", "cyrillic"] })

export const metadata = {
  title: 'TOO Alex - Автоматизация закупок',
  description: 'Система автоматизации процесса закупок',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  )
}
