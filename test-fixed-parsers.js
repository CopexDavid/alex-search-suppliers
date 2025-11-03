// Тест исправленных парсеров маркетплейсов
const http = require('http');

function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testFixedParsers() {
  console.log('🔧 ТЕСТИРОВАНИЕ ИСПРАВЛЕННЫХ ПАРСЕРОВ МАРКЕТПЛЕЙСОВ');
  console.log('='.repeat(70));
  console.log(`⏰ Время начала: ${new Date().toLocaleString('ru-RU')}`);
  console.log('');
  console.log('🎯 Цель: Проверить, что HTTP 429 и fetch failed ошибки исправлены');
  console.log('');
  
  // Используем запросы, которые гарантированно найдут мало результатов
  // чтобы активировать улучшенный поиск по маркетплейсам
  const testQueries = [
    'WPS3010B специальная модель', // Очень специфичный запрос
    'Wanptek редкая модель', // Редкий бренд
  ];
  
  for (const query of testQueries) {
    console.log(`📝 Тестируем запрос: "${query}"`);
    console.log('-'.repeat(50));
    
    try {
      console.log('📡 Отправляем запрос к API...');
      console.log('🔧 Ожидаем активации улучшенных парсеров маркетплейсов...');
      console.log('⏳ Это может занять 30-60 секунд из-за новых задержек и retry логики...');
      
      const startTime = Date.now();
      
      const result = await makeRequest({ searchQuery: query });
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log(`✅ Ответ получен за ${duration} секунд`);
      console.log(`📊 Статус: ${result.status}`);
      
      if (result.status === 200 && result.data) {
        const data = result.data;
        console.log(`📈 Статистика:`);
        console.log(`   - Всего результатов: ${data.totalResults || 0}`);
        console.log(`   - С WhatsApp: ${data.whatsappCount || 0}`);
        console.log(`   - Запрос: ${data.query || 'N/A'}`);
        
        if (data.results && data.results.length > 0) {
          // Подсчитываем результаты по источникам
          const sourceStats = {};
          data.results.forEach(result => {
            const source = result.source || 'google';
            sourceStats[source] = (sourceStats[source] || 0) + 1;
          });
          
          console.log(`\n📊 Результаты по источникам:`);
          Object.entries(sourceStats).forEach(([source, count]) => {
            const emoji = source === 'kaspi' ? '🛒' : source === 'satu' ? '🏪' : '🔍';
            const status = count > 0 ? '✅' : '❌';
            console.log(`   ${emoji} ${source}: ${count} результатов ${status}`);
          });
          
          // Показываем результаты с маркетплейсов
          const marketplaceResults = data.results.filter(r => r.source === 'kaspi' || r.source === 'satu');
          if (marketplaceResults.length > 0) {
            console.log(`\n🎉 УСПЕХ! Найдено ${marketplaceResults.length} результатов с маркетплейсов:`);
            marketplaceResults.forEach((result, index) => {
              const sourceEmoji = result.source === 'kaspi' ? '🛒' : '🏪';
              console.log(`${index + 1}. ${sourceEmoji} ${result.title || 'Без названия'}`);
              console.log(`   🌐 ${result.url || 'Без URL'}`);
              if (result.price) {
                console.log(`   💰 Цена: ${result.price}`);
              }
              console.log('');
            });
            
            console.log('🚀 ПАРСЕРЫ МАРКЕТПЛЕЙСОВ РАБОТАЮТ!');
          } else {
            console.log(`\n⚠️  Результатов с маркетплейсов не найдено`);
            console.log('   Возможные причины:');
            console.log('   - Сайты всё ещё блокируют запросы');
            console.log('   - Нужно больше времени для обхода защиты');
            console.log('   - Требуются дополнительные улучшения');
          }
          
        } else {
          console.log('❌ Результатов не найдено');
        }
      } else {
        console.log('❌ Ошибка API:', result.data);
      }
      
    } catch (error) {
      console.error(`❌ Ошибка при запросе "${query}":`, error.message);
    }
    
    // Пауза между запросами
    if (testQueries.indexOf(query) < testQueries.length - 1) {
      console.log('⏱️  Пауза 5 секунд перед следующим тестом...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
  console.log(`⏰ Время окончания: ${new Date().toLocaleString('ru-RU')}`);
  console.log('\n📋 РЕЗУЛЬТАТ:');
  console.log('- Если видите 🛒 (Kaspi) или 🏪 (Satu) результаты - ИСПРАВЛЕНИЯ РАБОТАЮТ!');
  console.log('- Если только 🔍 (Google) - нужны дополнительные улучшения');
  console.log('- Отсутствие HTTP 429 ошибок уже является улучшением');
}

// Ждем запуска контейнера
setTimeout(() => {
  testFixedParsers().catch(error => {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  });
}, 15000); // 15 секунд задержки для запуска контейнера

console.log('⏳ Ожидание запуска контейнера (15 секунд)...');
