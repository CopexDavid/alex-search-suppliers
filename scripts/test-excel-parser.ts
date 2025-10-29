// Тестирование парсера Excel файлов
import { parseExcelRequest, validateParsedRequest } from '../utils/excelParser'
import * as fs from 'fs'
import * as path from 'path'

async function testParser() {
  try {
    console.log('🧪 Тестирование парсера Excel заявок...\n')

    // Путь к тестовому файлу
    const testFilePath = path.join(process.cwd(), 'app', 'Заявка на потребность.xlsx')

    if (!fs.existsSync(testFilePath)) {
      console.error('❌ Файл не найден:', testFilePath)
      return
    }

    console.log('📂 Читаю файл:', testFilePath)

    // Читаем файл
    const fileBuffer = fs.readFileSync(testFilePath)
    console.log('✅ Файл прочитан. Размер:', fileBuffer.length, 'байт\n')

    // Парсим
    console.log('🔍 Парсинг...')
    const parsed = await parseExcelRequest(fileBuffer)

    // Выводим результат
    console.log('📋 Результат парсинга:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Номер заявки:', parsed.requestNumber)
    console.log('Срок выполнения:', parsed.deadline.toLocaleDateString('ru-RU'))
    console.log('Валюта:', parsed.currency)
    console.log('Приоритет:', parsed.priority, ['Низкий', 'Средний', 'Высокий'][parsed.priority])
    console.log('Описание:', parsed.description || '—')
    console.log('Инициатор:', parsed.initiator || '—')
    console.log('Бюджет:', parsed.budget || '—')
    console.log('\n📦 Позиции:', parsed.positions.length)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    parsed.positions.forEach((pos, index) => {
      console.log(`\n${index + 1}. ${pos.name}`)
      console.log(`   Описание: ${pos.description || '—'}`)
      console.log(`   Количество: ${pos.quantity} ${pos.unit}`)
      if (pos.sku) console.log(`   SKU: ${pos.sku}`)
      if (pos.price) console.log(`   Цена: ${pos.price}`)
      if (pos.vat) console.log(`   НДС: ${pos.vat}%`)
    })

    // Валидация
    console.log('\n\n✔️  Валидация...')
    const validation = validateParsedRequest(parsed)

    if (validation.valid) {
      console.log('✅ Данные валидны!')
    } else {
      console.log('❌ Найдены ошибки:')
      validation.errors.forEach((error) => {
        console.log('   •', error)
      })
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Тест завершен успешно!')
  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:', error)
    if (error instanceof Error) {
      console.error('Детали:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

testParser()

