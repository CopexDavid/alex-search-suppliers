// API для поиска поставщиков по конкретной позиции заявки (используя Custom Search как в основном поиске)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import puppeteer from 'puppeteer'
// import { searchMarketplaces, MarketplaceResult } from '@/services/marketplaceParsers' // ОТКЛЮЧЕНО
import { YandexSearchService, convertYandexResults } from '@/services/yandexSearch'
import { SerpApiService, convertSerpApiResults } from '@/services/serpApiSearch'
import { filterByRegion, SearchRegion } from '@/utils/regionFilter'
import { filterByCategories, enhanceQueryWithCategories } from '@/utils/categoryMapping'

const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID || 'd7065ea5c59764932'

interface SearchParams {
  params: {
    id: string
    positionId: string
  }
}

/**
 * Генерирует варианты поисковых запросов с учетом региона
 */
function buildSearchQuery(originalQuery: string, searchRegion: string = 'KAZAKHSTAN'): string[] {
  const query = originalQuery.trim();
  
  if (searchRegion === 'KAZAKHSTAN') {
    // Только Казахстан - исключаем российские сайты
    return [
      `${query} site:kz`,
      `${query} Казахстан -site:ru`,
      `${query} Kazakhstan -site:ru`,
      `${query} Алматы Астана`,
      query // базовый запрос как fallback
    ];
  } else {
    // СНГ - включаем все страны
    return [
      query,
      `${query} site:kz OR site:ru OR site:by OR site:ua`,
      `${query} Казахстан Россия`,
      `${query} Kazakhstan Russia`
    ];
  }
}

/**
 * Улучшает название поставщика на основе URL и других данных
 */
function getSupplierName(result: any): string {
  // Если есть companyName и он не совпадает с title, используем его
  if (result.companyName && result.companyName !== result.title && result.companyName.length > 3) {
    return result.companyName
  }
  
  // Пытаемся извлечь название из URL
  if (result.url) {
    try {
      const url = new URL(result.url)
      let domain = url.hostname.replace('www.', '')
      
      // Убираем расширение и делаем первую букву заглавной
      domain = domain.replace(/\.(kz|ru|com|org|net)$/, '')
      
      // Если домен содержит точки, берем последнюю часть
      const parts = domain.split('.')
      if (parts.length > 1) {
        domain = parts[parts.length - 1]
      }
      
      // Делаем первую букву заглавной
      return domain.charAt(0).toUpperCase() + domain.slice(1)
    } catch (e) {
      // Если не удалось распарсить URL, используем title
    }
  }
  
  // Fallback к title, но очищаем от лишнего
  let title = result.title || 'Неизвестный поставщик'
  
  // Убираем распространенные суффиксы
  title = title.replace(/\s*-\s*(купить|цена|заказать|доставка|интернет-магазин|магазин).*$/i, '')
  title = title.replace(/\s*\|\s*.*$/i, '') // Убираем все после |
  title = title.replace(/\s*—\s*.*$/i, '') // Убираем все после —
  
  // Ограничиваем длину
  if (title.length > 50) {
    title = title.substring(0, 47) + '...'
  }
  
  return title
}

/**
 * Фильтрует результаты поиска по региону
 */
function shouldIncludeResult(result: any, searchRegion: string): boolean {
  if (searchRegion !== 'KAZAKHSTAN') {
    return true; // Для СНГ включаем все результаты
  }
  
  // Для режима "Только Казахстан" применяем фильтры
  const url = result.url?.toLowerCase() || '';
  const phone = result.phone || '';
  
  // Исключаем российские домены
  if (url.includes('.ru/') || url.endsWith('.ru')) {
    console.log(`🚫 Исключен российский домен: ${result.url}`);
    return false;
  }
  
  // Исключаем российские номера телефонов (не начинающиеся с +7 77x, +7 70x, +7 71x, +7 72x)
  if (phone) {
    const cleanPhone = phone.replace(/\D/g, ''); // Убираем все нецифровые символы
    
    // Российские номера обычно начинаются с +7 9xx, +7 8xx, +7 4xx, +7 3xx, +7 5xx, +7 6xx
    // Казахстанские номера: +7 7xx
    if (cleanPhone.startsWith('7') && cleanPhone.length >= 4) {
      const prefix = cleanPhone.substring(1, 3); // Берем 2 цифры после 7
      if (!prefix.startsWith('7')) { // Если не 77x, 70x, 71x, 72x и т.д.
        console.log(`🚫 Исключен российский номер: ${phone}`);
        return false;
      }
    }
    
    // Исключаем 8-800 номера (российские бесплатные)
    if (cleanPhone.startsWith('8800') || phone.includes('8 (800)')) {
      console.log(`🚫 Исключен российский 8-800 номер: ${phone}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Парсит контакты с сайта (точно как в основном поиске)
 */
async function parseContacts(url: string): Promise<any> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://alexautozakup.kz' // Используем переменную окружения
    const response = await fetch(`${baseUrl}/api/parse-contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(30000), // 30 сек timeout как в основном поиске
    })
    
    if (!response.ok) {
      console.error(`Parse API error for ${url}: ${response.status} ${response.statusText}`)
      throw new Error(`Parse failed: ${response.status}`)
    }
    
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`Parse API returned non-JSON for ${url}: ${contentType}`)
      const text = await response.text()
      console.error(`Response text: ${text.substring(0, 200)}...`)
      throw new Error('Parse API returned non-JSON response')
    }
    
    const data = await response.json()
    
    if (!data.success) {
      console.error(`Parse API error for ${url}:`, data.error)
      return data.data || {}
    }
    
    return data.data || {}
  } catch (error) {
    console.error(`Parse error for ${url}:`, error)
    return {
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
      companyName: '',
      prices: []
    }
  }
}

/**
 * POST /api/requests/[id]/positions/[positionId]/search
 * Запускает поиск поставщиков для конкретной позиции
 */
export async function POST(
  request: NextRequest,
  { params }: SearchParams
) {
  try {
    const user = await requireAuth()
    const { id: requestId, positionId } = params
    
    console.log('\n' + '='.repeat(60))
    console.log(`🔍 SEARCH FOR POSITION`)
    console.log('='.repeat(60))
    console.log(`📝 Request ID: ${requestId}`)
    console.log(`📦 Position ID: ${positionId}`)
    
     console.log(`🔑 Using Search Engine ID: ${SEARCH_ENGINE_ID}`)
    
    // Получаем позицию
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: {
        request: true
      }
    })
    
    if (!position || position.requestId !== requestId) {
      console.log(`❌ Позиция ${positionId} не найдена или не принадлежит заявке ${requestId}`)
      console.log(`   Возможно, заявка была отредактирована во время поиска`)
      return NextResponse.json(
        { error: 'Позиция не найдена. Возможно, заявка была отредактирована во время поиска.' },
        { status: 404 }
      )
    }
    
     console.log(`📦 Position: ${position.name}`)
     
     const allResults = new Map<string, any>()
     
    // Обновляем статус позиции на SEARCHING (с проверкой существования)
    try {
      await prisma.position.update({
        where: { id: positionId },
        data: { 
          searchStatus: 'SEARCHING',
          updatedAt: new Date()
        }
      })
    } catch (updateError) {
      console.log(`⚠️ Не удалось обновить статус позиции ${positionId}, возможно она была удалена`)
    }
    
    console.log(`🔄 Updated position status to SEARCHING`)
    
    // Генерируем варианты запросов с учетом региона поиска и категорий
    const searchRegion = position.request.searchRegion || 'KAZAKHSTAN';
    const enableCategorization = position.request.enableCategorization || false;
    const categories = position.request.categories ? JSON.parse(position.request.categories) : [];
    
    let searchQueries = buildSearchQuery(position.name, searchRegion);
    
    // Если включена категоризация, улучшаем запросы
    if (enableCategorization && categories.length > 0) {
      const enhancedQueries = enhanceQueryWithCategories(position.name, categories);
      searchQueries = [...searchQueries, ...enhancedQueries];
      console.log(`🏷️ Categorization enabled: ${categories.join(', ')}`);
    }
    
    console.log(`🎯 Generated ${searchQueries.length} search variations for region ${searchRegion}:`);
    searchQueries.forEach((q, i) => console.log(`   ${i + 1}. "${q}"`));
    console.log('');
    
    // ПАРСИМ HTML НАПРЯМУЮ из веб-интерфейса CSE (как в основном поиске)
    const maxQueries = Math.min(10, searchQueries.length); // Больше запросов!
    for (let i = 0; i < maxQueries && allResults.size < 50; i++) { // Увеличим лимит до 50
      const query = searchQueries[i];
      console.log(`\n📌 Query ${i + 1}/${maxQueries}: "${query}"`);
      
      try {
       // Запускаем НАСТОЯЩИЙ браузер!
       const searchUrl = `https://cse.google.com/cse?cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`
       console.log(`  🌐 Opening browser: ${searchUrl}`)
       
       const browser = await puppeteer.launch({
         headless: true,
         args: [
           '--no-sandbox',
           '--disable-setuid-sandbox',
           '--disable-dev-shm-usage',
           '--disable-accelerated-2d-canvas',
           '--no-first-run',
           '--no-zygote',
           '--disable-gpu',
           '--disable-web-security',
           '--disable-features=VizDisplayCompositor'
         ],
         timeout: 60000
       })
       
       const page = await browser.newPage()
       
       // Переходим на страницу поиска
       await page.goto(searchUrl, { 
         waitUntil: 'networkidle2',
         timeout: 30000 
       })
       
       // Ждём пока загрузятся результаты
       await page.waitForSelector('.gs-webResult', { timeout: 10000 }).catch(() => {
         console.log('⚠️  No results found or timeout')
       })
       
       // ПАРСИМ НЕСКОЛЬКО СТРАНИЦ (до 5 страниц = 50 результатов)
       const allPageResults: any[] = []
       const maxPages = 5
       
       for (let pageNum = 0; pageNum < maxPages; pageNum++) {
         console.log(`📄 Page ${pageNum + 1}/${maxPages}`)
         
         // Извлекаем результаты с текущей страницы
         const pageResults = await page.evaluate(() => {
           const items: any[] = []
           const resultElements = document.querySelectorAll('.gs-webResult')
           
           resultElements.forEach((el) => {
             const titleEl = el.querySelector('.gs-title') as HTMLElement
             const linkEl = titleEl?.querySelector('a') as HTMLAnchorElement
             const snippetEl = el.querySelector('.gs-snippet') as HTMLElement
             
             if (linkEl && linkEl.href) {
               // Пытаемся найти цену в сниппете
               const snippetText = snippetEl?.textContent?.trim() || ''
               const priceMatch = snippetText.match(/(\d[\d\s]*(?:[\.,]\d+)?)\s*(?:₸|тг|тенге|руб|₽|USD|\$)/i)
               
               items.push({
                 url: linkEl.href,
                 title: titleEl?.textContent?.trim() || '',
                 snippet: snippetText,
                 price: priceMatch ? priceMatch[0] : null
               })
             }
           })
           
           return items
         })
         
         allPageResults.push(...pageResults)
         console.log(`  ✓ Found ${pageResults.length} results on page ${pageNum + 1}`)
         
         // Если это не последняя страница - пробуем перейти на следующую
         if (pageNum < maxPages - 1) {
           const hasNextButton = await page.evaluate(() => {
             const nextButtons = Array.from(document.querySelectorAll('.gsc-cursor-page'))
             const currentPage = document.querySelector('.gsc-cursor-current-page')
             if (!currentPage) return false
             
             const currentPageNum = parseInt(currentPage.textContent || '1')
             const nextButton = nextButtons.find(btn => 
               parseInt(btn.textContent || '0') === currentPageNum + 1
             )
             
             if (nextButton && nextButton instanceof HTMLElement) {
               nextButton.click()
               return true
             }
             return false
           })
           
           if (!hasNextButton) {
             console.log(`  ⚠️  No more pages available`)
             break
           }
           
           // Ждём загрузки следующей страницы
           await new Promise(resolve => setTimeout(resolve, 2000))
           await page.waitForSelector('.gs-webResult', { timeout: 5000 }).catch(() => {})
         }
       }
       
       await browser.close()
       
       const results = allPageResults
       console.log(`✅ Found ${results.length} results from browser`)
       
       let found = 0
       for (const result of results) {
         if (!result.url) continue
         
         if (allResults.has(result.url)) {
           console.log(`⏭️  Skip duplicate: ${result.url}`)
           continue
         }
         
         // Применяем региональную фильтрацию
         if (!shouldIncludeResult(result, searchRegion)) {
           continue
         }
         
         console.log(`✅ Found: ${result.url}`)
         console.log(`    📄 ${result.title}`)
         if (result.price) {
           console.log(`    💰 ${result.price}`)
         }
         
         allResults.set(result.url, {
           url: result.url,
           title: result.title,
           snippet: result.snippet,
           price: result.price,
           companyName: result.title,
           description: result.snippet,
         })
         
         found++
         
         if (allResults.size >= 30) break
       }
       
       console.log(`  📊 Added ${found} new results (total: ${allResults.size})`)
       
     } catch (error) {
       console.error(`  ❌ Error:`, error)
     }
     
     // Если уже достаточно - останавливаемся
     if (allResults.size >= 50) {
       console.log(`\n✅ SUCCESS: Reached 50 unique results!`);
       break;
     }
    }
     
     console.log('\n' + '='.repeat(60));
     console.log(`📊 GOOGLE CSE PHASE COMPLETE: ${allResults.size} unique websites found`);
     console.log('='.repeat(60));
    
    // ДОПОЛНИТЕЛЬНЫЙ ПОИСК ЧЕРЕЗ SERPAPI если мало результатов
    const MIN_RESULTS_FOR_SERPAPI = 10; // Порог для запуска SerpAPI
    
    if (allResults.size < MIN_RESULTS_FOR_SERPAPI) {
      console.log(`\n⚠️  Found only ${allResults.size} results, starting SerpAPI search for position...`);

      try {
        const serpApiService = new SerpApiService();

        if (serpApiService.isConfigured()) {
          console.log('🔍 Starting SerpAPI search for position...');
          const serpResults = await serpApiService.search(position.name, 30000); // 30 секунд таймаут
          const convertedResults = convertSerpApiResults(serpResults);

          // Добавляем результаты SerpAPI к общим результатам
          for (const serpResult of convertedResults) {
            if (!allResults.has(serpResult.url || '')) {
              console.log(`  ✅ Added SerpAPI result: ${serpResult.url}`);
              console.log(`      📄 ${serpResult.title}`);
              console.log(`      🔍 Source: serpapi`);
              if (serpResult.price) {
                console.log(`      💰 ${serpResult.price}`);
              }

              allResults.set(serpResult.url || '', {
                url: serpResult.url,
                title: serpResult.title,
                snippet: serpResult.snippet,
                price: serpResult.price,
                companyName: serpResult.companyName,
                description: serpResult.description,
                source: 'serpapi'
              });
            }
          }

          console.log(`\n📊 AFTER SERPAPI SEARCH: ${allResults.size} total unique websites found`);
        } else {
          console.log('⚠️  SerpAPI not configured, skipping');
        }

      } catch (error) {
        console.error('❌ Error in SerpAPI search:', error);
      }

    } else {
      console.log(`✅ Found ${allResults.size} results, skipping SerpAPI search`);
    }

    // ДОПОЛНИТЕЛЬНЫЙ ПОИСК ПО МАРКЕТПЛЕЙСАМ - ОТКЛЮЧЕНО из-за ошибок
    // const MIN_RESULTS_THRESHOLD = 3; // Минимальное количество результатов
    // 
    // if (allResults.size < MIN_RESULTS_THRESHOLD) {
    //   console.log(`\n⚠️  Found only ${allResults.size} results, starting marketplace search...`);
    //   
    //   try {
    //     const marketplaceResults = await searchMarketplaces(position.name);
    //     
    //     // Добавляем результаты маркетплейсов к общим результатам
    //     for (const marketResult of marketplaceResults) {
    //       if (!allResults.has(marketResult.url)) {
    //         console.log(`  ✅ Added marketplace result: ${marketResult.url}`);
    //         console.log(`      📄 ${marketResult.title}`);
    //         console.log(`      🏪 Source: ${marketResult.source}`);
    //         if (marketResult.price) {
    //           console.log(`      💰 ${marketResult.price}`);
    //         }
    //         
    //         allResults.set(marketResult.url, {
    //           url: marketResult.url,
    //           title: marketResult.title,
    //           snippet: marketResult.snippet || marketResult.description,
    //           price: marketResult.price,
    //           companyName: marketResult.companyName,
    //           description: marketResult.description,
    //           source: marketResult.source // Добавляем источник
    //         });
    //       }
    //     }
    //     
    //     console.log(`\n📊 AFTER MARKETPLACE SEARCH: ${allResults.size} total unique websites found`);
    //     
    //   } catch (error) {
    //     console.error('❌ Error in marketplace search:', error);
    //   }

      // ДОПОЛНИТЕЛЬНЫЙ ПОИСК ПО YANDEX если мало результатов (без маркетплейсов)
      const MIN_RESULTS_FOR_YANDEX = 5; // Минимальное количество результатов для Yandex
      if (allResults.size < MIN_RESULTS_FOR_YANDEX) {
        console.log(`\n⚠️  Found only ${allResults.size} results, starting Yandex search...`);
        
        try {
          const yandexService = new YandexSearchService();
          
          if (yandexService.isConfigured()) {
            console.log('🔍 Starting Yandex search for position...');
            const yandexResults = await yandexService.search(position.name, 30000); // 30 секунд таймаут
            const convertedResults = convertYandexResults(yandexResults);
            
            // Добавляем результаты Yandex к общим результатам
            for (const yandexResult of convertedResults) {
              if (!allResults.has(yandexResult.url || '')) {
                console.log(`  ✅ Added Yandex result: ${yandexResult.url}`);
                console.log(`      📄 ${yandexResult.title}`);
                console.log(`      🔍 Source: yandex`);
                
                allResults.set(yandexResult.url || '', {
                  url: yandexResult.url,
                  title: yandexResult.title,
                  snippet: yandexResult.snippet,
                  companyName: yandexResult.companyName,
                  description: yandexResult.description,
                  source: 'yandex'
                });
              }
            }
            
            console.log(`\n📊 AFTER YANDEX SEARCH: ${allResults.size} total unique websites found`);
          } else {
            console.log('⚠️  Yandex Search API not configured, skipping');
          }
          
        } catch (error) {
          console.error('❌ Error in Yandex search:', error);
        }
      } else {
        console.log(`✅ Found ${allResults.size} results, skipping Yandex search`);
      }
    
    if (allResults.size === 0) {
      return NextResponse.json({
        success: true,
        data: {
          positionId,
          positionName: position.name,
          suppliersFound: 0,
          suppliers: []
        }
      })
    }
    
     // Парсим контакты ПАРАЛЛЕЛЬНО для всех результатов (как в основном поиске)
     console.log('\n' + '='.repeat(60));
     console.log('📞 CONTACT PARSING PHASE');
     console.log('='.repeat(60));
     console.log(`Starting parallel parsing of ${allResults.size} websites...`);
     console.log('');
     
     // Применяем фильтрацию по регионам
     const allResultsArray = Array.from(allResults.values())
     let filteredResults = filterByRegion(allResultsArray, searchRegion as SearchRegion)
     
     console.log(`🌍 Region filter applied: ${allResultsArray.length} → ${filteredResults.length} results (region: ${searchRegion})`)
     
     // Применяем фильтрацию по категориям если включена
     if (enableCategorization && categories.length > 0) {
       const beforeCategoryFilter = filteredResults.length
       filteredResults = filterByCategories(filteredResults, categories)
       console.log(`🏷️ Category filter applied: ${beforeCategoryFilter} → ${filteredResults.length} results (categories: ${categories.join(', ')})`)
     }
     
     const resultsArray = filteredResults
     
     const parsePromises = resultsArray.map(async (result) => {
       try {
         const contacts = await parseContacts(result.url)
         return {
           ...result,
           phone: contacts.phone || '',
           email: contacts.email || '',
           whatsapp: contacts.whatsapp || '',
           address: contacts.address || '',
           companyName: contacts.companyName || result.title,
           prices: contacts.prices || [],
           foundAt: new Date().toLocaleTimeString('ru-RU', { 
             hour: '2-digit', 
             minute: '2-digit', 
             second: '2-digit' 
           })
         }
       } catch (error) {
         console.error(`❌ Error parsing contacts for ${result.url}:`, error)
         return {
           ...result,
           phone: '',
           email: '',
           whatsapp: '',
           address: '',
           companyName: result.title,
           prices: [],
           foundAt: new Date().toLocaleTimeString('ru-RU', { 
             hour: '2-digit', 
             minute: '2-digit', 
             second: '2-digit' 
           })
         }
       }
     })
     
     const searchResults = await Promise.all(parsePromises)
     
     const whatsappCount = searchResults.filter(r => r.whatsapp).length
     const phoneCount = searchResults.filter(r => r.phone).length
     const emailCount = searchResults.filter(r => r.email).length
     
     console.log('\n' + '='.repeat(60));
     console.log('✅ SEARCH COMPLETE!');
     console.log('='.repeat(60));
     console.log(`📊 Results:`);
     console.log(`   Total companies: ${searchResults.length}`);
     console.log(`   📱 With phone: ${phoneCount} (${Math.round(phoneCount/searchResults.length*100)}%)`);
     console.log(`   💬 With WhatsApp: ${whatsappCount} (${Math.round(whatsappCount/searchResults.length*100)}%)`);
     console.log(`   📧 With email: ${emailCount} (${Math.round(emailCount/searchResults.length*100)}%)`);
     console.log('='.repeat(60) + '\n');
    
    // Сохраняем поставщиков в БД
    const savedSuppliers = []
    
    for (const result of searchResults) {
      // Пропускаем результаты без контактов
      if (!result.phone && !result.whatsapp && !result.email) {
        continue
      }
      
      try {
        // Ищем существующего поставщика по website
        let supplier = await prisma.supplier.findFirst({
          where: {
            website: result.url
          }
        })
        
        // Улучшаем название поставщика
        const supplierName = getSupplierName(result)
        
        if (supplier) {
          // Обновляем существующего
          supplier = await prisma.supplier.update({
            where: { id: supplier.id },
            data: {
              name: supplierName,
              description: result.snippet,
              phone: result.phone || undefined,
              email: result.email || undefined,
              whatsapp: result.whatsapp || undefined,
              address: result.address || undefined,
            }
          })
        } else {
          // Создаем нового
          supplier = await prisma.supplier.create({
            data: {
              name: supplierName,
              website: result.url,
              description: result.snippet,
              phone: result.phone || undefined,
              email: result.email || undefined,
              whatsapp: result.whatsapp || undefined,
              address: result.address || undefined,
              rating: 0,
              tags: null, // Для SQLite используем null вместо пустого массива
            }
          })
        }
        
        // Связываем с заявкой (если еще не связан)
        const existing = await prisma.requestSupplier.findUnique({
          where: {
            requestId_supplierId: {
              requestId,
              supplierId: supplier.id
            }
          }
        })
        
        if (!existing) {
          await prisma.requestSupplier.create({
            data: {
              requestId,
              supplierId: supplier.id,
              status: 'PENDING',
              foundVia: `auto-search-${position.name}`,
            }
          })
          
          savedSuppliers.push(supplier)
        }
        
      } catch (error) {
        console.error(`Error saving supplier for ${result.url}:`, error)
      }
    }
    
    console.log(`\n✅ Saved ${savedSuppliers.length} suppliers to database`)
    
    // Обновляем статус позиции (с проверкой существования)
    try {
      await prisma.position.update({
        where: { id: positionId },
        data: { 
          searchStatus: 'SUPPLIERS_FOUND',
          updatedAt: new Date()
        }
      })
    } catch (updateError) {
      console.log(`⚠️ Не удалось обновить статус позиции ${positionId}, возможно она была удалена`)
    }
    
    console.log(`✅ Updated position status to SUPPLIERS_FOUND`)
    
    // Создаем audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SEARCH_SUPPLIERS',
        entity: 'Position',
        entityId: positionId,
        details: {
          positionName: position.name,
          suppliersFound: savedSuppliers.length
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        positionId,
        positionName: position.name,
        suppliersFound: savedSuppliers.length,
        suppliers: savedSuppliers
      }
    })
    
   } catch (error: any) {
     console.error('\n' + '='.repeat(60))
     console.error('❌ DETAILED ERROR IN POSITION SEARCH')
     console.error('='.repeat(60))
     console.error('❌ Error type:', typeof error)
     console.error('❌ Error name:', error.name)
     console.error('❌ Error message:', error.message)
     console.error('❌ Error stack:', error.stack)
     console.error('='.repeat(60))
     
     // Более подробная информация об ошибке
     let errorMessage = 'Ошибка при поиске поставщиков'
     
     if (error.message?.includes('timeout')) {
       errorMessage = 'Превышено время ожидания при поиске'
     } else if (error.message?.includes('network')) {
       errorMessage = 'Ошибка сети при поиске'
     } else if (error.message?.includes('browser')) {
       errorMessage = 'Ошибка запуска браузера для поиска'
     } else if (error.message?.includes('Unauthorized')) {
       errorMessage = 'Ошибка авторизации'
     } else if (error.message) {
       errorMessage = error.message
     }
     
     return NextResponse.json(
       { 
         error: errorMessage,
         details: process.env.NODE_ENV === 'development' ? {
           message: error.message,
           stack: error.stack,
           name: error.name,
           type: typeof error
         } : undefined
       },
       { status: 500 }
     )
   }
}

