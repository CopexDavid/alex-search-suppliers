#!/usr/bin/env tsx

/**
 * Тестовый скрипт для проверки парсинга PDF документов
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { parsePDFCommercialOffer } from '../utils/cpParser'

async function testPDFParser() {
  console.log('🧪 Тестируем парсер PDF документов...\n')
  
  // Список PDF файлов для тестирования
  const testFiles = [
    'doc_1762693702249_________________________________________-_CU___________1_.pdf',
    'doc_1762693982990_________________________________________-_CU___________1_.pdf',
    'doc_1762694046141_________________________________________-_CU___________1_.pdf',
    'doc_1762704612263_________________________________________-_CU___________1_.pdf',
    'doc_1762704735589_________________________________________-_CU___________1_.pdf'
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
      
      // Парсим PDF
      console.log('🔄 Начинаем парсинг...')
      const result = await parsePDFCommercialOffer(buffer, fileName)
      
      // Выводим результат
      console.log('\n✅ РЕЗУЛЬТАТ ПАРСИНГА:')
      console.log(`📝 Извлеченный текст (${result.extractedText?.length || 0} символов):`)
      console.log(`"${result.extractedText?.substring(0, 500)}${result.extractedText && result.extractedText.length > 500 ? '...' : ''}"`)
      
      console.log(`\n📊 Статистика:`)
      console.log(`- Валюта: ${result.currency}`)
      console.log(`- Позиций: ${result.positions?.length || 0}`)
      console.log(`- Общая стоимость: ${result.totalPrice || 'не определена'}`)
      console.log(`- Компания: ${result.company || 'не определена'}`)
      console.log(`- Уверенность: ${result.confidence}%`)
      console.log(`- Требует ручной проверки: ${result.needsManualReview ? 'ДА' : 'НЕТ'}`)
      
      if (result.positions && result.positions.length > 0) {
        console.log(`\n📋 Позиции:`)
        result.positions.slice(0, 3).forEach((pos, idx) => {
          console.log(`  ${idx + 1}. ${pos.name} - ${pos.quantity} ${pos.unit} × ${pos.price} = ${pos.total}`)
        })
        if (result.positions.length > 3) {
          console.log(`  ... и еще ${result.positions.length - 3} позиций`)
        }
      }
      
    } catch (error) {
      console.error(`❌ ОШИБКА при парсинге файла ${fileName}:`)
      console.error(error)
    }
    
    console.log('\n' + '='.repeat(80))
  }
}

// Запускаем тест
testPDFParser().catch(console.error)
