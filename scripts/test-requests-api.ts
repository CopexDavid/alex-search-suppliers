// Тестируем API /api/requests для страницы ИИ анализа
import fetch from 'node-fetch'

async function testRequestsAPI() {
  try {
    console.log('🔍 Тестируем API /api/requests...\n')
    
    const baseUrl = 'https://alexautozakup'
    
    // Тест 1: Все заявки
    console.log('📋 Тест 1: Все заявки')
    const allResponse = await fetch(`${baseUrl}/api/requests`)
    const allData = await allResponse.json()
    
    console.log(`Статус: ${allResponse.status}`)
    console.log(`Найдено заявок: ${allData.requests?.length || 0}`)
    if (allData.requests?.length > 0) {
      allData.requests.forEach((req: any) => {
        console.log(`  - ${req.requestNumber}: ${req.status}`)
      })
    }
    console.log('')
    
    // Тест 2: Заявки со статусом COMPARING
    console.log('📊 Тест 2: Заявки со статусом COMPARING')
    const comparingResponse = await fetch(`${baseUrl}/api/requests?status=COMPARING`)
    const comparingData = await comparingResponse.json()
    
    console.log(`Статус: ${comparingResponse.status}`)
    console.log(`Найдено заявок: ${comparingData.requests?.length || 0}`)
    if (comparingData.requests?.length > 0) {
      comparingData.requests.forEach((req: any) => {
        console.log(`  - ${req.requestNumber}: ${req.status}`)
        console.log(`    Позиций: ${req.positions?.length || 0}`)
        req.positions?.forEach((pos: any) => {
          console.log(`      * ${pos.name}: quotesReceived=${pos.quotesReceived}`)
        })
      })
    }
    console.log('')
    
    // Тест 3: Заявки со статусом PENDING_QUOTES,COMPARING (как на странице ИИ анализа)
    console.log('🤖 Тест 3: Заявки для ИИ анализа (PENDING_QUOTES,COMPARING)')
    const aiResponse = await fetch(`${baseUrl}/api/requests?status=PENDING_QUOTES,COMPARING`)
    const aiData = await aiResponse.json()
    
    console.log(`Статус: ${aiResponse.status}`)
    console.log(`Найдено заявок: ${aiData.requests?.length || 0}`)
    if (aiData.requests?.length > 0) {
      aiData.requests.forEach((req: any) => {
        console.log(`  - ${req.requestNumber}: ${req.status}`)
        console.log(`    Позиций: ${req.positions?.length || 0}`)
        req.positions?.forEach((pos: any) => {
          console.log(`      * ${pos.name}: quotesReceived=${pos.quotesReceived}`)
        })
      })
    } else {
      console.log('❌ Заявки не найдены!')
      console.log('Возможные причины:')
      console.log('- API возвращает ошибку')
      console.log('- Неправильный фильтр статусов')
      console.log('- Проблемы с аутентификацией')
    }
    
    if (aiResponse.status !== 200) {
      console.log(`\n❌ Ошибка API: ${aiResponse.status}`)
      console.log('Ответ:', aiData)
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error)
  }
}

testRequestsAPI()
