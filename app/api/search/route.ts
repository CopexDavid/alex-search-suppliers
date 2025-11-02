import { NextResponse } from 'next/server';
import { SearchResult, SearchResponse } from '@/types/search';
import puppeteer from 'puppeteer';

const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID || 'd7065ea5c59764932';

// ============================================
// МИНИМАЛЬНАЯ ФИЛЬТРАЦИЯ - только явный мусор
// ============================================
const BLACKLIST_DOMAINS = [
  'adilet.zan.kz',        // законы РК
  '.edu.kz',              // университеты
  '.gov.kz',              // госсайты  
  'egov.kz',              // госуслуги
  'zakon.kz',             // законы
  'wikipedia',            // энциклопедии
  'youtube.com',          // видео
  'facebook.com',         // соцсети
  'instagram.com',
  'vk.com',
  'twitter.com',
  'tengrinews',           // новости
  'forbes.kz',
  'kapital.kz'
];



// ============================================
// БЕЗ ФИЛЬТРАЦИИ - принимаем ВСЁ!
// ============================================
function isRelevant(url: string, title: string, snippet: string): boolean {
  // Принимаем ВСЁ что возвращает Google - без исключений!
  console.log(`  ✅ ACCEPT ALL: ${url}`);
  console.log(`     Title: ${title.substring(0, 80)}`);
  return true;
}

// Список проверенных казахстанских сайтов для поиска
const KZ_TOOL_SITES = [
  'otvertka.kz',
  'pribor.kz',
  'protool.kz',
  'oramus.kz',
  'kaspi.kz',
  'lemanapro.kz',
  'kingforce.kz',
  'megatool.kz',
  'all-tools.kz',
  'aziyasnab.kz',
  'force-tools.kz',
  'ozon.kz',
  'wildberries.kz',
  'marketkz.kz',
];

// ============================================
// ПРОСТОЙ ПОИСК - используем напрямую Custom Search
// ============================================
function buildSearchQuery(originalQuery: string): string[] {
  // Просто возвращаем оригинальный запрос - Google CSE сам настроен на Казахстан
  const query = originalQuery.trim();
  return [query];
}

/**
 * Парсит контакты с сайта
 */
async function parseContacts(url: string): Promise<any> {
  try {
    const baseUrl = 'http://127.0.0.1:3000' // Принудительно IPv4 для внутренних API вызовов
    const response = await fetch(`${baseUrl}/api/parse-contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(30000), // 5 сек timeout
    });
    
    if (!response.ok) throw new Error('Parse failed');
    
    const data = await response.json();
    return data.data || {};
  } catch (error) {
    console.error(`Parse error for ${url}:`, error);
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const { searchQuery } = await request.json();

    if (!searchQuery) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    console.log('\n' + '='.repeat(60));
    console.log('🔍 NEW SEARCH REQUEST - ПАРСИМ HTML');
    console.log('='.repeat(60));
    console.log('📝 Original query:', searchQuery);
    console.log('');
    
    const allResults = new Map<string, any>(); // URL -> result
    
    // Генерируем варианты запросов
    const searchQueries = buildSearchQuery(searchQuery);
    console.log(`🎯 Generated ${searchQueries.length} search variations:`);
    searchQueries.forEach((q, i) => console.log(`   ${i + 1}. "${q}"`));
    console.log('');
    
    // ПАРСИМ HTML НАПРЯМУЮ из веб-интерфейса CSE
    const maxQueries = Math.min(10, searchQueries.length); // Больше запросов!
    for (let i = 0; i < maxQueries && allResults.size < 50; i++) { // Увеличим лимит до 50
      const query = searchQueries[i];
      console.log(`\n📌 Query ${i + 1}/${maxQueries}: "${query}"`);
      
      try {
        // Запускаем НАСТОЯЩИЙ браузер!
        const searchUrl = `https://cse.google.com/cse?cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`;
        console.log(`  🌐 Opening browser: ${searchUrl}`);
        
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
        });
        
        const page = await browser.newPage();
        
        // Переходим на страницу поиска
        await page.goto(searchUrl, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        // Ждём пока загрузятся результаты
        await page.waitForSelector('.gs-webResult', { timeout: 10000 }).catch(() => {
          console.log('  ⚠️  No results found or timeout');
        });
        
        // ПАРСИМ НЕСКОЛЬКО СТРАНИЦ (до 5 страниц = 50 результатов)
        const allPageResults: any[] = [];
        const maxPages = 5;
        
        for (let pageNum = 0; pageNum < maxPages; pageNum++) {
          console.log(`  📄 Page ${pageNum + 1}/${maxPages}`);
          
          // Извлекаем результаты с текущей страницы
          const pageResults = await page.evaluate(() => {
            const items: any[] = [];
            const resultElements = document.querySelectorAll('.gs-webResult');
            
            resultElements.forEach((el) => {
              const titleEl = el.querySelector('.gs-title') as HTMLElement;
              const linkEl = titleEl?.querySelector('a') as HTMLAnchorElement;
              const snippetEl = el.querySelector('.gs-snippet') as HTMLElement;
              
              if (linkEl && linkEl.href) {
                // Пытаемся найти цену в сниппете
                const snippetText = snippetEl?.textContent?.trim() || '';
                const priceMatch = snippetText.match(/(\d[\d\s]*(?:[\.,]\d+)?)\s*(?:₸|тг|тенге|руб|₽|USD|\$)/i);
                
                items.push({
                  url: linkEl.href,
                  title: titleEl?.textContent?.trim() || '',
                  snippet: snippetText,
                  price: priceMatch ? priceMatch[0] : null
                });
              }
            });
            
            return items;
          });
          
          allPageResults.push(...pageResults);
          console.log(`    ✓ Found ${pageResults.length} results on page ${pageNum + 1}`);
          
          // Если это не последняя страница - пробуем перейти на следующую
          if (pageNum < maxPages - 1) {
            const hasNextButton = await page.evaluate(() => {
              const nextButtons = Array.from(document.querySelectorAll('.gsc-cursor-page'));
              const currentPage = document.querySelector('.gsc-cursor-current-page');
              if (!currentPage) return false;
              
              const currentPageNum = parseInt(currentPage.textContent || '1');
              const nextButton = nextButtons.find(btn => 
                parseInt(btn.textContent || '0') === currentPageNum + 1
              );
              
              if (nextButton && nextButton instanceof HTMLElement) {
                nextButton.click();
                return true;
              }
              return false;
            });
            
            if (!hasNextButton) {
              console.log(`    ⚠️  No more pages available`);
              break;
            }
            
            // Ждём загрузки следующей страницы
            await new Promise(resolve => setTimeout(resolve, 2000));
            await page.waitForSelector('.gs-webResult', { timeout: 5000 }).catch(() => {});
          }
        }
        
        await browser.close();
        
        const results = allPageResults;
        
        console.log(`  ✅ Found ${results.length} results from browser`);
        
        let found = 0;
        for (const result of results) {
          if (!result.url) continue;
          
          if (allResults.has(result.url)) {
            console.log(`  ⏭️  Skip duplicate: ${result.url}`);
            continue;
          }
          
          console.log(`  ✅ Found: ${result.url}`);
          console.log(`      📄 ${result.title}`);
          if (result.price) {
            console.log(`      💰 ${result.price}`);
          }
          
          allResults.set(result.url, {
            url: result.url,
            title: result.title,
            snippet: result.snippet,
            price: result.price,
            companyName: result.title,
            description: result.snippet,
          });
          
          found++;
          
          if (allResults.size >= 30) break;
        }
        
        console.log(`  📊 Added ${found} new results (total: ${allResults.size})`);
        
      } catch (error) {
        console.error(`  ❌ Error:`, error);
      }
      
      // Если уже достаточно - останавливаемся
      if (allResults.size >= 50) {
        console.log(`\n✅ SUCCESS: Reached 50 unique results!`);
        break;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 SEARCH PHASE COMPLETE: ${allResults.size} unique websites found`);
    console.log('='.repeat(60));
    
    if (allResults.size === 0) {
      return NextResponse.json({
        results: [],
        query: searchQuery,
        timestamp: new Date().toISOString(),
        totalResults: 0,
        whatsappCount: 0
      });
    }
    
    // Парсим контакты ПАРАЛЛЕЛЬНО для всех результатов
    console.log('\n' + '='.repeat(60));
    console.log('📞 CONTACT PARSING PHASE');
    console.log('='.repeat(60));
    console.log(`Starting parallel parsing of ${allResults.size} websites...`);
    console.log('');
    const resultsArray = Array.from(allResults.values());
    
    const parsePromises = resultsArray.map(async (result) => {
      const contacts = await parseContacts(result.url);
      return {
        ...result,
        phone: contacts.phone || '',
        email: contacts.email || '',
        whatsapp: contacts.whatsapp || '',
        address: contacts.address || '',
        companyName: contacts.companyName || result.title,
        prices: contacts.prices || [], // Добавляем цены
        foundAt: new Date().toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        })
      };
    });
    
    const searchResults = await Promise.all(parsePromises);
    
    const whatsappCount = searchResults.filter(r => r.whatsapp).length;
    const phoneCount = searchResults.filter(r => r.phone).length;
    const emailCount = searchResults.filter(r => r.email).length;
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SEARCH COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Results:`);
    console.log(`   Total companies: ${searchResults.length}`);
    console.log(`   📱 With phone: ${phoneCount} (${Math.round(phoneCount/searchResults.length*100)}%)`);
    console.log(`   💬 With WhatsApp: ${whatsappCount} (${Math.round(whatsappCount/searchResults.length*100)}%)`);
    console.log(`   📧 With email: ${emailCount} (${Math.round(emailCount/searchResults.length*100)}%)`);
    console.log('='.repeat(60) + '\n');

    const searchResponse: SearchResponse = {
      results: searchResults,
      query: searchQuery,
      timestamp: new Date().toISOString(),
      totalResults: searchResults.length,
      whatsappCount
    };

    return NextResponse.json(searchResponse);
    
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to process search request' },
      { status: 500 }
    );
  }
}
