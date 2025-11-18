"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Calendar,
  User,
  FileText,
  Package,
  DollarSign,
  Loader2,
  Download,
  Building2,
  Phone,
  Mail,
  Printer,
} from "lucide-react"
import Link from "next/link"

interface ReportData {
  request: {
    id: string
    requestNumber: string
    description: string
    createdAt: string
    deadline: string
    status: string
    creator: {
      name: string
      email: string
    }
  }
  positions: {
    id: string
    name: string
    description: string | null
    quantity: number
    unit: string
    selectedOffer: {
      id: string
      company: string
      totalPrice: number
      currency: string
      pricePerUnit: number | null
      deliveryTerm: string | null
      paymentTerm: string | null
      validUntil: string | null
      fileName: string
      filePath: string | null
      createdAt: string
      supplier: {
        phoneNumber: string
        contactName: string | null
      } | null
    } | null
    finalChoice: string | null
  }[]
  decision: {
    selectedSupplier: string
    finalPrice: number
    finalCurrency: string
    reason: string
    decidedBy: {
      name: string
      email: string
    }
    decidedAt: string
  } | null
  summary: {
    totalPositions: number
    totalPrice: number
    currency: string
    positionsWithOffers: number
  }
}

export default function RequestReportPage() {
  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string
  
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    loadReport()
  }, [requestId])

  const loadReport = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/requests/${requestId}/report`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setReport(data.data)
      } else if (response.status === 400) {
        const errorData = await response.json()
        alert(errorData.error)
        router.push(`/requests/${requestId}`)
      } else {
        alert('Ошибка загрузки отчета')
        router.push(`/requests/${requestId}`)
      }
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Ошибка загрузки отчета')
    } finally {
      setLoading(false)
    }
  }

  const downloadOfferFile = async (offerId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/commercial-offers/${offerId}/download`, {
        credentials: 'include'
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Ошибка скачивания файла')
      }
    } catch (error) {
      console.error('Error downloading file:', error)
      alert('Ошибка скачивания файла')
    }
  }

  const printReport = () => {
    window.print()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: number, currency: string = 'KZT') => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ' + currency
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-muted-foreground">Загрузка отчета...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Отчет не найден</h2>
          <Link href={`/requests/${requestId}`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Вернуться к заявке
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl print:p-4">
      {/* Заголовок с навигацией */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center space-x-4">
          <Link href={`/requests/${requestId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Отчет по заявке</h1>
            <p className="text-muted-foreground mt-1">{report.request.requestNumber}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={printReport}>
            <Printer className="mr-2 h-4 w-4" />
            Печать
          </Button>
        </div>
      </div>

      {/* Отчет */}
      <div className="space-y-6 print:space-y-4">
        {/* Заголовок отчета */}
        <div className="text-center border-b pb-4 print:border-b-2">
          <h2 className="text-3xl font-bold mb-2">Отчет по заявке</h2>
          <p className="text-xl text-muted-foreground">{report.request.requestNumber}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Дата формирования: {formatDate(new Date().toISOString())}
          </p>
        </div>

        {/* Информация о заявке */}
        <Card>
          <CardHeader>
            <CardTitle>Информация о заявке</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Номер заявки</div>
                <div className="font-medium">{report.request.requestNumber}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Дата создания</div>
                <div className="font-medium">{formatDate(report.request.createdAt)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Срок выполнения</div>
                <div className="font-medium">{formatDate(report.request.deadline)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Инициатор</div>
                <div className="font-medium">{report.request.creator.name}</div>
                <div className="text-xs text-muted-foreground">{report.request.creator.email}</div>
              </div>
            </div>
            {report.request.description && (
              <div className="mt-4">
                <div className="text-sm text-muted-foreground mb-1">Описание</div>
                <div>{report.request.description}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Выбранные коммерческие предложения */}
        <Card>
          <CardHeader>
            <CardTitle>Выбранные коммерческие предложения</CardTitle>
            <CardDescription>
              Позиции заявки и выбранные поставщики
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№</TableHead>
                  <TableHead>Позиция</TableHead>
                  <TableHead>Количество</TableHead>
                  <TableHead>Поставщик</TableHead>
                  <TableHead>Цена за единицу</TableHead>
                  <TableHead>Общая стоимость</TableHead>
                  <TableHead>Срок поставки</TableHead>
                  <TableHead className="print:hidden">Документ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.positions.map((position, index) => (
                  <TableRow key={position.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{position.name}</div>
                      {position.description && (
                        <div className="text-xs text-muted-foreground">{position.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {position.quantity} {position.unit}
                    </TableCell>
                    <TableCell>
                      {position.selectedOffer ? (
                        <div>
                          <div className="font-medium">{position.selectedOffer.company}</div>
                          {position.selectedOffer.supplier && (
                            <div className="text-xs text-muted-foreground">
                              {position.selectedOffer.supplier.contactName || position.selectedOffer.supplier.phoneNumber}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Не выбрано</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {position.selectedOffer?.pricePerUnit 
                        ? formatPrice(position.selectedOffer.pricePerUnit, position.selectedOffer.currency)
                        : '—'
                      }
                    </TableCell>
                    <TableCell className="font-medium">
                      {position.selectedOffer 
                        ? formatPrice(position.selectedOffer.totalPrice, position.selectedOffer.currency)
                        : '—'
                      }
                    </TableCell>
                    <TableCell>
                      {position.selectedOffer?.deliveryTerm || '—'}
                    </TableCell>
                    <TableCell className="print:hidden">
                      {position.selectedOffer?.filePath && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadOfferFile(position.selectedOffer!.id, position.selectedOffer!.fileName)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Итоговая информация */}
        <Card>
          <CardHeader>
            <CardTitle>Итоговая информация</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Всего позиций</div>
                <div className="text-2xl font-bold">{report.summary.totalPositions}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Позиций с КП</div>
                <div className="text-2xl font-bold">{report.summary.positionsWithOffers}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Общая стоимость</div>
                <div className="text-2xl font-bold">
                  {formatPrice(report.summary.totalPrice, report.summary.currency)}
                </div>
              </div>
              {report.decision && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Решение принято</div>
                  <div className="text-sm font-medium">{formatDate(report.decision.decidedAt)}</div>
                  <div className="text-xs text-muted-foreground">{report.decision.decidedBy.name}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Дополнительная информация о выбранных предложениях */}
        {report.positions.some(p => p.selectedOffer) && (
          <Card>
            <CardHeader>
              <CardTitle>Детали выбранных предложений</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.positions
                  .filter(p => p.selectedOffer)
                  .map((position) => (
                    <div key={position.id} className="border-b last:border-b-0 pb-4 last:pb-0">
                      <div className="font-medium mb-2">{position.name}</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground mb-1">Поставщик</div>
                          <div>{position.selectedOffer?.company}</div>
                        </div>
                        {position.selectedOffer?.supplier && (
                          <div>
                            <div className="text-muted-foreground mb-1">Контакты</div>
                            <div>{position.selectedOffer.supplier.contactName || position.selectedOffer.supplier.phoneNumber}</div>
                          </div>
                        )}
                        {position.selectedOffer?.paymentTerm && (
                          <div>
                            <div className="text-muted-foreground mb-1">Условия оплаты</div>
                            <div>{position.selectedOffer.paymentTerm}</div>
                          </div>
                        )}
                        {position.selectedOffer?.validUntil && (
                          <div>
                            <div className="text-muted-foreground mb-1">Срок действия КП</div>
                            <div>{position.selectedOffer.validUntil}</div>
                          </div>
                        )}
                        {position.finalChoice && (
                          <div className="col-span-full">
                            <div className="text-muted-foreground mb-1">Примечание</div>
                            <div>{position.finalChoice}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Решение по заявке */}
        {report.decision && (
          <Card>
            <CardHeader>
              <CardTitle>Решение по заявке</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Обоснование выбора</div>
                  <div>{report.decision.reason}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Принято</div>
                    <div>{formatDate(report.decision.decidedAt)}</div>
                    <div className="text-xs text-muted-foreground">{report.decision.decidedBy.name}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Стили для печати */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border-b-2 {
            border-bottom-width: 2px !important;
          }
          .print\\:p-4 {
            padding: 1rem !important;
          }
          .print\\:space-y-4 > * + * {
            margin-top: 1rem !important;
          }
        }
      `}</style>
    </div>
  )
}

