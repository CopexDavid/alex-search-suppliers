// Парсер Excel файлов заявок
import * as XLSX from 'xlsx'

interface ParsedPosition {
  sku?: string
  name: string
  description?: string
  quantity: number
  unit: string
  price?: number
  vat?: number
}

interface ParsedRequest {
  requestNumber: string
  deadline: Date
  budget?: number
  currency: string
  priority: number
  description?: string
  initiator?: string
  importance?: string
  positions: ParsedPosition[]
}

/**
 * Парсит Excel файл заявки из 1С
 */
export async function parseExcelRequest(buffer: Buffer): Promise<ParsedRequest> {
  try {
    // Читаем Excel файл
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Конвертируем в JSON с диапазоном
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      defval: '',
      raw: false 
    }) as any[][]

    // Извлекаем данные из структуры файла
    let requestNumber = ''
    let deadline = new Date()
    let importance = 'Средний'
    let initiator = ''
    let currency = 'KZT'
    const positions: ParsedPosition[] = []

    // Ищем номер заявки в первой строке
    const firstRow = data[0]?.join(' ') || ''
    const numberMatch = firstRow.match(/№(\d+)/)
    if (numberMatch) {
      requestNumber = `REQ-${numberMatch[1]}`
    }

    // Ищем дату
    const dateMatch = firstRow.match(/от\s+([\d.]+)/)
    if (dateMatch) {
      const [day, month, year] = dateMatch[1].split('.')
      deadline = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }

    // Проходим по строкам и ищем нужные данные
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      if (!row || row.length === 0) continue

      const firstCell = String(row[0] || '').trim()
      
      // Важность
      if (firstCell.includes('Важность:') || row.some((cell: any) => String(cell).includes('Важность'))) {
        const importanceCell = row.find((cell: any) => String(cell).includes('Высокая') || String(cell).includes('Средняя') || String(cell).includes('Низкая'))
        if (importanceCell) {
          importance = String(importanceCell).trim()
        }
      }

      // Дата закупки
      if (firstCell.includes('Дата закупки')) {
        const dateValue = row[1]
        if (dateValue && typeof dateValue === 'string') {
          const [day, month, year] = dateValue.split('.')
          if (day && month && year) {
            deadline = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          }
        }
      }

      // Валюта
      if (firstCell.includes('Валюта')) {
        const currencyValue = row.find((cell: any) => ['KZT', 'USD', 'EUR', 'RUB'].includes(String(cell)))
        if (currencyValue) {
          currency = String(currencyValue)
        }
      }

      // Исполнитель (ищем в конце документа)
      if (firstCell.includes('Исполнитель:')) {
        initiator = String(row[2] || row[1] || '').trim()
        // Убираем слово "склад" если есть
        initiator = initiator.replace(/\s*склад\s*/gi, '').trim()
      }

      // Таблица позиций - ищем заголовки
      if (firstCell.includes('Номенклатура')) {
        // Проверяем что это строка заголовков (есть "Содержание", "Ед. изм.", "Кол-во")
        const rowStr = row.join(' ').toLowerCase()
        if (rowStr.includes('содержание') && rowStr.includes('кол-во')) {
          // Следующие строки - это позиции
          for (let j = i + 1; j < data.length; j++) {
            const posRow = data[j]
            if (!posRow || posRow.length === 0) continue
            
            // Проверяем что это не виза и не пустая строка
            const firstPosCell = String(posRow[0] || '').trim()
            if (!firstPosCell || 
                firstPosCell.includes('Виза') || 
                firstPosCell.includes('Руководитель') ||
                firstPosCell.includes('Комментарий') ||
                firstPosCell.includes('Исполнитель')) {
              break
            }

            // Парсим позицию
            // Структура: [0]=Номенклатура [2]=Содержание [4]=Ед.изм [5]=Кол-во
            const nomenclature = String(posRow[0] || '').trim()
            const content = String(posRow[2] || '').trim()
            const unit = String(posRow[4] || 'шт').trim()
            const quantityStr = String(posRow[5] || '0').replace(',', '.')
            const quantity = parseFloat(quantityStr) || 0

            if (nomenclature && quantity > 0) {
              positions.push({
                name: nomenclature,
                description: content || nomenclature,
                unit: unit || 'шт',
                quantity,
              })
            }
          }
          break
        }
      }
    }

    // Если не нашли номер заявки, генерируем
    if (!requestNumber) {
      requestNumber = `REQ-${Date.now()}`
    }

    // Преобразуем важность в приоритет
    let priority = 0
    if (importance.includes('Высок')) priority = 2
    else if (importance.includes('Средн')) priority = 1
    else priority = 0

    // Если не нашли исполнителя в теле, ищем в конце после всей таблицы
    if (!initiator) {
      for (let i = data.length - 1; i >= 0; i--) {
        const row = data[i]
        const firstCell = String(row[0] || '').trim()
        if (firstCell.includes('Исполнитель:')) {
          initiator = String(row[2] || row[1] || '').trim()
          initiator = initiator.replace(/\s*склад\s*/gi, '').trim()
          break
        }
      }
    }

    return {
      requestNumber,
      deadline,
      currency,
      priority,
      description: initiator ? `Инициатор: ${initiator}` : `Заявка ${requestNumber}`,
      initiator,
      importance,
      positions,
    }
  } catch (error) {
    console.error('Excel parse error:', error)
    throw new Error(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Валидирует распарсенные данные
 */
export function validateParsedRequest(data: ParsedRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.requestNumber) {
    errors.push('Не удалось определить номер заявки')
  }

  if (!data.deadline || isNaN(data.deadline.getTime())) {
    errors.push('Не удалось определить дату закупки')
  }

  if (!data.positions || data.positions.length === 0) {
    errors.push('Не найдено ни одной позиции в заявке')
  }

  data.positions.forEach((pos, index) => {
    if (!pos.name) {
      errors.push(`Позиция ${index + 1}: отсутствует наименование`)
    }
    if (!pos.quantity || pos.quantity <= 0) {
      errors.push(`Позиция ${index + 1}: некорректное количество`)
    }
    if (!pos.unit) {
      errors.push(`Позиция ${index + 1}: не указана единица измерения`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

