#!/usr/bin/env tsx

import prisma from '../lib/prisma'

/**
 * Скрипт для исправления отрицательных значений quotesReceived и quotesRequested
 */
async function fixNegativeQuotes() {
  console.log('🔧 Исправление отрицательных значений счетчиков КП...')
  
  try {
    // Находим позиции с отрицательными значениями
    const negativePositions = await prisma.position.findMany({
      where: {
        OR: [
          { quotesReceived: { lt: 0 } },
          { quotesRequested: { lt: 0 } }
        ]
      },
      include: {
        request: {
          select: { requestNumber: true }
        }
      }
    })
    
    console.log(`📊 Найдено ${negativePositions.length} позиций с отрицательными значениями`)
    
    if (negativePositions.length === 0) {
      console.log('✅ Отрицательных значений не найдено!')
      return
    }
    
    // Показываем проблемные позиции
    for (const position of negativePositions) {
      console.log(`❌ Заявка ${position.request.requestNumber}, позиция "${position.name}":`)
      console.log(`   quotesRequested: ${position.quotesRequested}`)
      console.log(`   quotesReceived: ${position.quotesReceived}`)
    }
    
    // Исправляем отрицательные значения
    const result = await prisma.position.updateMany({
      where: {
        OR: [
          { quotesReceived: { lt: 0 } },
          { quotesRequested: { lt: 0 } }
        ]
      },
      data: {
        quotesReceived: 0,
        quotesRequested: 0
      }
    })
    
    console.log(`✅ Исправлено ${result.count} позиций`)
    console.log('🎉 Все отрицательные значения исправлены!')
    
  } catch (error) {
    console.error('❌ Ошибка при исправлении:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Запускаем скрипт
if (require.main === module) {
  fixNegativeQuotes()
}
