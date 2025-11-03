import puppeteer from 'puppeteer';

export interface MarketplaceResult {
  url: string;
  title: string;
  price?: string;
  companyName?: string;
  description?: string;
  snippet?: string;
  source: 'kaspi' | 'satu';
}

/**
 * Очищает запрос от лишних слов для более точного поиска в маркетплейсах
 */
function cleanSearchQuery(query: string): string {
  // Убираем общие слова, которые мешают точному поиску
  const stopWords = [
    'купить', 'оптом', 'казахстан', 'казахстане', 'россия', 'россии', 
    'цена', 'недорого', 'дешево', 'заказать', 'продажа', 'магазин', 
    'интернет', 'доставка', 'склад', 'поставка', 'поставщик'
  ];
  
  const words = query.toLowerCase().split(/\s+/);
  const cleanWords = words.filter(word => 
    word.length > 2 && 
    !stopWords.includes(word) &&
    !/^\d+$/.test(word) // убираем чисто числовые значения
  );
  
  // Если остались ключевые слова, используем их, иначе берем первые 2-3 слова оригинала
  if (cleanWords.length > 0) {
    return cleanWords.slice(0, 3).join(' '); // Максимум 3 ключевых слова
  }
  
  return words.slice(0, 2).join(' '); // Первые 2 слова как fallback
}

/**
 * Парсер для kaspi.kz
 */
export async function parseKaspi(query: string): Promise<MarketplaceResult[]> {
  console.log(`🛒 Searching Kaspi.kz for: "${query}"`);
  console.log(`⏰ Start time: ${new Date().toISOString()}`);
  
  // Добавляем случайную задержку перед запуском (1-3 секунды)
  const randomDelay = Math.floor(Math.random() * 3000) + 1000;
  console.log(`  ⏱️  Random delay: ${randomDelay}ms`);
  await new Promise(resolve => setTimeout(resolve, randomDelay));
  
  try {
    const searchUrl = `https://kaspi.kz/shop/search/?text=${encodeURIComponent(query)}`;
    console.log(`  🌐 Opening: ${searchUrl}`);
    
    console.log(`  🚀 Launching browser...`);
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
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-component-extensions-with-background-pages'
      ],
      timeout: 60000,
      protocolTimeout: 120000 // Увеличиваем таймаут протокола
    });
    console.log(`  ✅ Browser launched successfully`);
    
    console.log(`  📄 Creating new page...`);
    const page = await browser.newPage();
    console.log(`  ✅ Page created successfully`);
    
    // Устанавливаем реалистичный User-Agent
    console.log(`  🔧 Setting realistic user agent...`);
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
    ];
    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
    await page.setUserAgent(randomUA);
    console.log(`  ✅ User agent set: ${randomUA.substring(0, 50)}...`);
    
    // Добавляем реалистичные заголовки
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // Устанавливаем viewport как у реального браузера
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Скрываем автоматизацию
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
    
    // Переходим на страницу с retry логикой
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`  🌐 Attempt ${retryCount + 1}/${maxRetries} to load page...`);
        
        await page.goto(searchUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 45000 
        });
        
        // Проверяем, не заблокированы ли мы
        const pageTitle = await page.title();
        const pageContent = await page.content();
        
        if (pageContent.includes('Access denied') || pageContent.includes('blocked') || pageTitle.includes('403')) {
          throw new Error('Access denied or blocked');
        }
        
        console.log(`  ✅ Page loaded successfully: ${pageTitle.substring(0, 50)}...`);
        break;
        
      } catch (error) {
        retryCount++;
        console.log(`  ⚠️  Attempt ${retryCount} failed: ${error.message}`);
        
        if (retryCount >= maxRetries) {
          throw error;
        }
        
        // Увеличиваем задержку между попытками
        const retryDelay = retryCount * 2000 + Math.random() * 3000;
        console.log(`  ⏱️  Waiting ${Math.round(retryDelay)}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // Добавляем человеческую задержку
    const humanDelay = Math.floor(Math.random() * 3000) + 2000;
    console.log(`  🤖 Human-like delay: ${humanDelay}ms`);
    await new Promise(resolve => setTimeout(resolve, humanDelay));
    
    // Ждем загрузки результатов с несколькими попытками
    const selectors = [
      '.item__container',
      '.product-item', 
      '[data-testid="product-item"]',
      '.items-row .item',
      '.item-card',
      '.goods-tile'
    ];
    
    let elementsFound = false;
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 10000 });
        console.log(`  ✅ Found elements with selector: ${selector}`);
        elementsFound = true;
        break;
      } catch (error) {
        console.log(`  ❌ Selector ${selector} not found`);
      }
    }
    
    if (!elementsFound) {
      console.log('  ⚠️  No product elements found with any selector');
    }
    
    // Добавляем дополнительное ожидание для загрузки товаров
    console.log(`  ⏳ Waiting for products to load...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const results = await page.evaluate(() => {
      const items: any[] = [];
      
      // Обновленные селекторы для Kaspi на основе скриншота
      const selectors = [
        '.item-card',
        '.item',
        '.product-item',
        '[data-testid="product-item"]',
        '.item__container',
        '.product-card',
        'div[class*="item"]',
        'article',
        '.goods-tile'
      ];
      
      console.log('🔍 Searching for products with different selectors...');
      
      let productElements: NodeListOf<Element> | null = null;
      let usedSelector = '';
      
      for (const selector of selectors) {
        productElements = document.querySelectorAll(selector);
        if (productElements.length > 0) {
          console.log(`✅ Found ${productElements.length} products with selector: ${selector}`);
          usedSelector = selector;
          break;
        } else {
          console.log(`❌ Selector ${selector}: 0 elements`);
        }
      }
      
      if (!productElements || productElements.length === 0) {
        console.log('❌ No products found with any selector');
        // Попробуем найти любые ссылки на товары
        const allLinks = document.querySelectorAll('a[href*="/shop/p/"], a[href*="kaspi.kz/shop/p/"]');
        console.log(`🔗 Found ${allLinks.length} product links`);
        return items;
      }
      
      console.log(`📦 Processing ${productElements.length} products...`);
      
      productElements.forEach((el, index) => {
        if (index >= 20) return; // Ограничиваем до 20 результатов
        
        try {
          // Ищем ссылку на товар - более широкий поиск
          let linkEl = el.querySelector('a[href*="/shop/p/"]') as HTMLAnchorElement;
          if (!linkEl) {
            linkEl = el.querySelector('a') as HTMLAnchorElement;
          }
          if (!linkEl) return;
          
          // Название товара - более широкий поиск
          let titleEl = el.querySelector('.item__name, .product-name, [data-testid="product-name"], .item-card__name, .goods-tile__name') as HTMLElement;
          if (!titleEl) {
            titleEl = el.querySelector('h3, h4, .title, [class*="title"], [class*="name"]') as HTMLElement;
          }
          const title = titleEl?.textContent?.trim() || linkEl.textContent?.trim() || '';
          
          // Цена - более широкий поиск
          let priceEl = el.querySelector('.item__price, .product-price, [data-testid="product-price"], .item-card__price, .goods-tile__price') as HTMLElement;
          if (!priceEl) {
            priceEl = el.querySelector('[class*="price"], .cost, .amount') as HTMLElement;
          }
          const price = priceEl?.textContent?.trim() || '';
          
          // Продавец/магазин
          let sellerEl = el.querySelector('.item__seller, .seller-name, [data-testid="seller-name"], .item-card__seller') as HTMLElement;
          if (!sellerEl) {
            sellerEl = el.querySelector('[class*="seller"], [class*="shop"], [class*="store"]') as HTMLElement;
          }
          const seller = sellerEl?.textContent?.trim() || '';
          
          if (title && linkEl.href) {
            console.log(`📦 Product ${index + 1}: ${title.substring(0, 50)}...`);
            items.push({
              url: linkEl.href.startsWith('http') ? linkEl.href : `https://kaspi.kz${linkEl.href}`,
              title: title,
              price: price,
              companyName: seller || 'Kaspi.kz',
              description: `${title} - ${price}`,
              snippet: `Товар на Kaspi.kz: ${title}. Цена: ${price}. Продавец: ${seller}`,
              source: 'kaspi'
            });
          }
        } catch (error) {
          console.error('Error parsing Kaspi product:', error);
        }
      });
      
      console.log(`✅ Successfully parsed ${items.length} products`);
      return items;
    });
    
    await browser.close();
    
    console.log(`  ✅ Found ${results.length} results from Kaspi.kz`);
    return results;
    
  } catch (error) {
    console.error('Error parsing Kaspi:', error);
    return [];
  }
}

/**
 * Парсер для satu.kz
 */
export async function parseSatu(query: string): Promise<MarketplaceResult[]> {
  console.log(`🏪 Searching Satu.kz for: "${query}"`);
  console.log(`⏰ Start time: ${new Date().toISOString()}`);
  
  // Добавляем случайную задержку перед запуском (2-5 секунд)
  const randomDelay = Math.floor(Math.random() * 4000) + 2000;
  console.log(`  ⏱️  Random delay: ${randomDelay}ms`);
  await new Promise(resolve => setTimeout(resolve, randomDelay));
  
  try {
    const searchUrl = `https://satu.kz/search?search_term=${encodeURIComponent(query)}`;
    console.log(`  🌐 Opening: ${searchUrl}`);
    
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
    
    // Устанавливаем User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Добавляем дополнительные заголовки
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });
    
    await page.goto(searchUrl, { 
      waitUntil: 'domcontentloaded', // Быстрее чем networkidle2
      timeout: 20000 // Уменьшили с 30 до 20 секунд
    });
    
    // Уменьшили задержку
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Ждем загрузки результатов с коротким таймаутом
    await page.waitForSelector('.product-item, .catalog-item, .search-result-item, .item-card, .product-card', { timeout: 8000 }).catch(() => {
      console.log('  ⚠️  No Satu results found or timeout');
    });
    
    // Добавляем дополнительное ожидание для загрузки товаров
    console.log(`  ⏳ Waiting for products to load...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const results = await page.evaluate(() => {
      const items: any[] = [];
      
      // ПРАВИЛЬНЫЕ селекторы на основе реального HTML Satu.kz
      console.log('🔍 Using correct Satu.kz selectors from raw HTML analysis...');
      
      // Ищем товары по data-qaid атрибуту (это точный селектор из HTML)
      const productElements = document.querySelectorAll('[data-qaid="qa_product_tile"]');
      console.log(`✅ Found ${productElements.length} products with data-qaid="qa_product_tile"`);
      
      if (productElements.length === 0) {
        console.log('❌ No products found with main selector, trying fallback...');
        
        // Fallback: ищем прямо в тексте страницы товары Wanptek
        const pageText = document.body.innerText;
        if (pageText.includes('Wanptek WPS3010B')) {
          console.log('✅ Found Wanptek products in page text');
          
          // Ищем все ссылки, которые могут вести на товары
          const allLinks = document.querySelectorAll('a[href*="blok-pitaniya"], a[href*="wanptek"], a[href*="/p"]');
          console.log(`🔗 Found ${allLinks.length} potential product links`);
          
          allLinks.forEach((link, index) => {
            if (index >= 10) return; // Ограничиваем
            
            const linkEl = link as HTMLAnchorElement;
            const linkText = linkEl.textContent?.trim() || '';
            
            if (linkText.toLowerCase().includes('wanptek') || linkText.toLowerCase().includes('блок питания')) {
              // Ищем цену рядом с ссылкой
              const parent = linkEl.closest('div, li, article') || linkEl.parentElement;
              const priceEl = parent?.querySelector('[data-qaid="product_price"], .price, [class*="price"]') as HTMLElement;
              const price = priceEl?.textContent?.trim() || '';
              
              items.push({
                url: linkEl.href.startsWith('http') ? linkEl.href : `https://satu.kz${linkEl.href}`,
                title: linkText,
                price: price,
                companyName: 'Satu.kz',
                description: `${linkText} - ${price}`,
                snippet: `Товар на Satu.kz: ${linkText}. Цена: ${price}`,
                source: 'satu'
              });
            }
          });
        }
        
        return items;
      }
      
      console.log(`📦 Processing ${productElements.length} products...`);
      
      productElements.forEach((el, index) => {
        if (index >= 20) return; // Ограничиваем до 20 результатов
        
        try {
          // Ищем ссылку на товар по точному селектору
          const linkEl = el.querySelector('[data-qaid="product_link"]') as HTMLAnchorElement;
          if (!linkEl) {
            console.log(`❌ No product link found in product ${index + 1}`);
            return;
          }
          
          // Название товара из title атрибута ссылки или текста
          const title = linkEl.getAttribute('title') || linkEl.textContent?.trim() || '';
          
          // Цена по точному селектору
          const priceEl = el.querySelector('[data-qaid="product_price"]') as HTMLElement;
          const price = priceEl?.textContent?.trim() || '';
          
          // Компания (может быть в разных местах)
          let companyEl = el.querySelector('.company-name, .seller-name, .shop-name') as HTMLElement;
          const company = companyEl?.textContent?.trim() || 'Satu.kz';
          
          if (title && linkEl.href) {
            console.log(`📦 Product ${index + 1}: ${title.substring(0, 50)}...`);
            console.log(`   💰 Price: ${price}`);
            console.log(`   🔗 URL: ${linkEl.href}`);
            
            items.push({
              url: linkEl.href.startsWith('http') ? linkEl.href : `https://satu.kz${linkEl.href}`,
              title: title,
              price: price,
              companyName: company,
              description: `${title} - ${price}`,
              snippet: `Товар на Satu.kz: ${title}. Цена: ${price}. Компания: ${company}`,
              source: 'satu'
            });
          }
        } catch (error) {
          console.error('Error parsing Satu product:', error);
        }
      });
      
      console.log(`✅ Successfully parsed ${items.length} products`);
      return items;
    });
    
    await browser.close();
    
    console.log(`  ✅ Found ${results.length} results from Satu.kz`);
    return results;
    
  } catch (error) {
    console.error('Error parsing Satu:', error);
    return [];
  }
}

/**
 * Комбинированный поиск по всем маркетплейсам
 */
export async function searchMarketplaces(query: string): Promise<MarketplaceResult[]> {
  console.log('\n' + '='.repeat(60));
  console.log('🛍️  MARKETPLACE SEARCH PHASE');
  console.log('='.repeat(60));
  console.log(`📝 Original query: "${query}"`);
  
  // Очищаем запрос от лишних слов для более точного поиска
  const cleanQuery = cleanSearchQuery(query);
  console.log(`🎯 Cleaned query: "${cleanQuery}"`);
  
  const results: MarketplaceResult[] = [];
  
  try {
    // Запускаем поиск по маркетплейсам с обработкой ошибок для каждого
    console.log('🛒 Kaspi.kz enabled (may have blocking issues)');
    console.log('🏪 Satu.kz working correctly');
    
    const searchPromises = [
      parseKaspi(cleanQuery).catch(error => {
        console.error(`❌ Kaspi search failed: ${error.message}`);
        return [];
      }),
      parseSatu(cleanQuery).catch(error => {
        console.error(`❌ Satu search failed: ${error.message}`);
        return [];
      })
    ];
    
    const [kaspiResults, satuResults] = await Promise.all(searchPromises);
    
    results.push(...kaspiResults);
    results.push(...satuResults);
    
    console.log(`\n📊 MARKETPLACE RESULTS:`);
    console.log(`   Kaspi.kz: ${kaspiResults.length} товаров ${kaspiResults.length > 0 ? '✅' : '❌'}`);
    console.log(`   Satu.kz: ${satuResults.length} товаров ${satuResults.length > 0 ? '✅' : '❌'}`);
    console.log(`   Total: ${results.length} товаров`);
    
    if (results.length > 0) {
      console.log('🎉 SUCCESS: Found marketplace results!');
    } else {
      console.log('⚠️  No marketplace results found (sites may be blocking requests)');
    }
    
    console.log('='.repeat(60));
    
    return results;
    
  } catch (error) {
    console.error('❌ Critical error in marketplace search:', error);
    return results;
  }
}
