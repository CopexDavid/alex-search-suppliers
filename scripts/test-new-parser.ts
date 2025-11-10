#!/usr/bin/env tsx

/**
 * Тестовый скрипт для нового парсера документов
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { parseDocument } from '../utils/documentParser'

async function testNewParser() {
  console.log('🧪 Тестируем новый парсер документов...\n')
  
  // Список PDF файлов для тестирования
  const testFiles = [
    'doc_1762693702249_________________________________________-_CU___________1_.pdf'
  ]
  
  for (const fileName of testFiles) {
    console.log(`\n📄 Тестируем файл: ${fileName}`)
    console.log('=' .repeat(80))
    
    try {
      const filePath = join(process.cwd(), 'temp-docs', fileName)
      console.log(`📂 Путь к файлу: ${filePath}`)
      
      // Читаем файл
      const buffer = readFileSync(filePath)
      console.log(`📊 Размер файла: ${buffer.length} байт`)
      
      // Парсим документ новым парсером
      console.log('🔄 Начинаем парсинг новым парсером...')
      const result = await parseDocument(buffer, fileName, 'application/pdf')
      
      // Выводим результат
      console.log('\n✅ РЕЗУЛЬТАТ НОВОГО ПАРСЕРА:')
      console.log(`📝 Извлеченный текст (${result.extractedText?.length || 0} символов):`)
      console.log(`"${result.extractedText?.substring(0, 500)}${result.extractedText && result.extractedText.length > 500 ? '...' : ''}"`)
      
      console.log(`\n📊 Структурированные данные:`)
      console.log(`- Валюта: ${result.currency}`)
      console.log(`- Общая стоимость: ${result.totalPrice || 'не определена'}`)
      console.log(`- Компания: ${result.company || 'не определена'}`)
      console.log(`- Срок поставки: ${result.deliveryTerm || 'не указан'}`)
      console.log(`- Условия оплаты: ${result.paymentTerm || 'не указаны'}`)
      console.log(`- Позиций: ${result.positions?.length || 0}`)
      console.log(`- Уверенность: ${result.confidence}%`)
      console.log(`- Требует ручной проверки: ${result.needsManualReview ? 'ДА' : 'НЕТ'}`)
      
      if (result.positions && result.positions.length > 0) {
        console.log(`\n📋 Позиции:`)
        result.positions.forEach((pos, idx) => {
          console.log(`  ${idx + 1}. ${pos.name}`)
          console.log(`     Количество: ${pos.quantity} ${pos.unit}`)
          console.log(`     Цена за единицу: ${pos.unitPrice || 'не указана'}`)
          console.log(`     Общая стоимость: ${pos.totalPrice || 'не указана'}`)
          if (pos.description) {
            console.log(`     Описание: ${pos.description}`)
          }
        })
      }
      
    } catch (error) {
      console.error(`❌ ОШИБКА при парсинге файла ${fileName}:`)
      console.error(error)
    }
    
    console.log('\n' + '='.repeat(80))
  }
}

// Запускаем тест
testNewParser().catch(console.error)
