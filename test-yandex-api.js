// Тест Yandex Search API
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
          resolve({ status: res.statusCode, data: responseData, parseError: error.message });
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

async function testYandexAPI() {
  console.log('🔍 ТЕСТ YANDEX SEARCH API ИНТЕГРАЦИИ');
  console.log('='.repeat(70));
  console.log('🎯 Цель: Проверить интеграцию Yandex Search API');
  console.log('📋 Логика:');
  console.log('   1. Google поиск < 5 результатов → активируется маркетплейс поиск');
  console.log('   2. Если все еще < 5 результатов → активируется Yandex поиск');
  console.log('');
  
  // Используем редкий запрос, который даст мало результатов Google
  const query = 'редкий товар xyz123 специальный';
  
  console.log(`📝 Тестовый запрос: "${query}"`);
  console.log('⏱️  Ожидаем активации Yandex поиска...');
  console.log('');
  
  try {
    console.log('📡 Отправляем запрос...');
    const startTime = Date.now();
    
    const result = await makeRequest({ searchQuery: query });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Ответ получен за ${duration} секунд`);
    console.log(`📊 Статус: ${result.status}`);
    
    if (result.parseError) {
      console.log('❌ JSON Parse Error:', result.parseError);
      console.log('📄 Raw response (first 500 chars):');
      console.log(result.data.substring(0, 500));
      return;
    }
    
    if (result.status === 200 && result.data) {
      const data = result.data;
      console.log(`📈 Всего результатов: ${data.totalResults || 0}`);
      
      // Подсчитываем по источникам
      const sourceStats = {};
      if (data.results && data.results.length > 0) {
        data.results.forEach(result => {
          const source = result.source || 'google';
          sourceStats[source] = (sourceStats[source] || 0) + 1;
        });
      }
      
      console.log(`\n📊 Результаты по источникам:`);
      console.log(`   🔍 Google: ${sourceStats.google || 0} результатов`);
      console.log(`   🛒 Kaspi: ${sourceStats.kaspi || 0} результатов`);
      console.log(`   🏪 Satu: ${sourceStats.satu || 0} результатов`);
      console.log(`   🔍 Yandex: ${sourceStats.yandex || 0} результатов`);
      
      if (sourceStats.yandex > 0) {
        console.log(`\n🎉 УСПЕХ! Yandex Search API работает!`);
        console.log(`✅ Найдено ${sourceStats.yandex} результатов через Yandex`);
        
        // Показываем результаты Yandex
        const yandexResults = data.results.filter(r => r.source === 'yandex');
        console.log('\n📋 Результаты Yandex:');
        yandexResults.slice(0, 3).forEach((result, index) => {
          console.log(`${index + 1}. 🔍 ${result.title}`);
          console.log(`   🌐 ${result.url}`);
          console.log(`   📄 ${result.snippet || result.description || ''}`);
          console.log('');
        });
        
      } else {
        console.log(`\n⚠️  Yandex результатов нет`);
        console.log('🔍 Возможные причины:');
        console.log('   - Yandex API ключи не настроены (проверьте .env)');
        console.log('   - Google нашел достаточно результатов (≥5)');
        console.log('   - Yandex API не отвечает или возвращает ошибки');
        console.log('   - Таймаут Yandex поиска (30 секунд)');
      }
      
      if (data.results && data.results.length > 0) {
        console.log('\n📋 Первые 3 результата (любые источники):');
        data.results.slice(0, 3).forEach((result, index) => {
          const sourceEmoji = result.source === 'yandex' ? '🔍' : 
                             result.source === 'kaspi' ? '🛒' : 
                             result.source === 'satu' ? '🏪' : '🔍';
          console.log(`${index + 1}. ${sourceEmoji} [${result.source || 'google'}] ${result.title}`);
        });
      }
      
    } else {
      console.log(`⚠️  Неожиданный статус: ${result.status}`);
      console.log('📄 Response:', result.data);
    }
    
  } catch (error) {
    console.error('❌ Ошибка запроса:', error.message);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📋 ИНСТРУКЦИИ ПО НАСТРОЙКЕ:');
  console.log('1. Получите API ключ Yandex Search API');
  console.log('2. Добавьте в .env:');
  console.log('   YANDEX_SEARCH_API_KEY=ваш_ключ');
  console.log('   YANDEX_FOLDER_ID=ваш_folder_id');
  console.log('3. Перезапустите контейнер: docker restart alex-app');
  console.log('✅ ТЕСТ ЗАВЕРШЕН');
}

testYandexAPI().catch(console.error);
