// Тест API поиска поставщиков
import fetch from 'node-fetch'

async function testSearchAPI() {
  try {
    console.log('🧪 Тестирование API поиска...\n')

    // Получаем список заявок
    console.log('1. Получение списка заявок...')
    const requestsRes = await fetch('https://alexautozakup.kz/api/requests', {
      credentials: 'include',
    })
    
    if (!requestsRes.ok) {
      console.error('❌ Ошибка при получении заявок:', requestsRes.status)
      return
    }

    const requestsData = await requestsRes.json()
    console.log(`✅ Получено ${requestsData.data?.length || 0} заявок`)

    if (!requestsData.data || requestsData.data.length === 0) {
      console.log('ℹ️  Нет заявок для тестирования')
      return
    }

    // Берем первую заявку
    const firstRequest = requestsData.data[0]
    console.log(`\n2. Тестируем поиск для заявки: ${firstRequest.requestNumber}`)
    console.log(`   ID: ${firstRequest.id}`)

    // Запускаем поиск
    console.log('\n3. Запуск поиска поставщиков...')
    const searchRes = await fetch(`https://alexautozakup.kz/api/requests/${firstRequest.id}/search`, {
      method: 'POST',
      credentials: 'include',
    })

    console.log(`   Статус ответа: ${searchRes.status}`)
    console.log(`   Content-Type: ${searchRes.headers.get('content-type')}`)

    if (!searchRes.ok) {
      const errorText = await searchRes.text()
      console.error(`❌ Ошибка при поиске:`)
      console.error(errorText.substring(0, 500))
      return
    }

    const searchData = await searchRes.json()
    console.log('\n✅ Поиск завершен успешно!')
    console.log(`   Найдено: ${searchData.data?.suppliersFound || 0} поставщиков`)
    console.log(`   Сохранено: ${searchData.data?.suppliersSaved || 0} поставщиков`)
    console.log(`   Запросов: ${searchData.data?.searchQueries || 0}`)

    console.log('\n✅ Тест завершен успешно!')
  } catch (error) {
    console.error('\n❌ Ошибка:', error)
    if (error instanceof Error) {
      console.error('Сообщение:', error.message)
      console.error('Stack:', error.stack)
    }
  }
}

testSearchAPI()

