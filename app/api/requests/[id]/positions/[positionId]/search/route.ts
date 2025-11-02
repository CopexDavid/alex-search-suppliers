// API для поиска поставщиков по конкретной позиции заявки (используя Custom Search как в основном поиске)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import puppeteer from 'puppeteer'

const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID || 'd7065ea5c59764932'

interface SearchParams {
  params: {
    id: string
    positionId: string
  }
}

/**
 * Парсит контакты с сайта (точно как в основном поиске)
 */
async function parseContacts(url: string): Promise<any> {
  try {
    const baseUrl = 'http://127.0.0.1:3000' // Принудительно IPv4 для внутренних API вызовов
    const response = await fetch(`${baseUrl}/api/parse-contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(20000), // 5 сек timeout
    })
    
    if (!response.ok) throw new Error('Parse failed')
    
    const data = await response.json()
    return data.data || {}
  } catch (error) {
    console.error(`Parse error for ${url}:`, error)
    return {}
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
      return NextResponse.json(
        { error: 'Позиция не найдена' },
        { status: 404 }
      )
    }
    
     console.log(`📦 Position: ${position.name}`)
     
     const searchQuery = position.name
     const allResults = new Map<string, any>()
     
    // ИСПОЛЬЗУЕМ ТУ ЖЕ ЛОГИКУ ЧТО И В ОСНОВНОМ ПОИСКЕ
    console.log(`📌 Query: "${searchQuery}"`)
    
    // Обновляем статус позиции на SEARCHING
    await prisma.position.update({
      where: { id: positionId },
      data: { 
        searchStatus: 'SEARCHING',
        updatedAt: new Date()
      }
    })
    
    console.log(`🔄 Updated position status to SEARCHING`)
    
    try {
       // Запускаем НАСТОЯЩИЙ браузер!
       const searchUrl = `https://cse.google.com/cse?cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}`
       console.log(`🌐 Opening browser: ${searchUrl}`)
       
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
       
       console.log(`📊 Added ${found} new results (total: ${allResults.size})`)
       
     } catch (error) {
       console.error(`❌ Browser error:`, error)
     }
     
     console.log(`\n📊 SEARCH PHASE COMPLETE: ${allResults.size} unique websites found`)
    
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
     console.log('\n📞 CONTACT PARSING PHASE')
     console.log(`Starting parallel parsing of ${allResults.size} websites...`)
     
     const resultsArray = Array.from(allResults.values())
     
     const parsePromises = resultsArray.map(async (result) => {
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
     })
     
     const searchResults = await Promise.all(parsePromises)
     
     const whatsappCount = searchResults.filter(r => r.whatsapp).length
     const phoneCount = searchResults.filter(r => r.phone).length
     const emailCount = searchResults.filter(r => r.email).length
     
     console.log('\n✅ CONTACT PARSING COMPLETE!')
     console.log(`📊 Results:`)
     console.log(`   Total companies: ${searchResults.length}`)
     console.log(`   📱 With phone: ${phoneCount} (${Math.round(phoneCount/searchResults.length*100)}%)`)
     console.log(`   💬 With WhatsApp: ${whatsappCount} (${Math.round(whatsappCount/searchResults.length*100)}%)`)
     console.log(`   📧 With email: ${emailCount} (${Math.round(emailCount/searchResults.length*100)}%)`)
    
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
        
        if (supplier) {
          // Обновляем существующего
          supplier = await prisma.supplier.update({
            where: { id: supplier.id },
            data: {
              name: result.companyName || result.title,
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
              name: result.companyName || result.title,
              website: result.url,
              description: result.snippet,
              phone: result.phone || undefined,
              email: result.email || undefined,
              whatsapp: result.whatsapp || undefined,
              address: result.address || undefined,
              rating: 0,
              tags: [],
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
    
    // Обновляем статус позиции
    await prisma.position.update({
      where: { id: positionId },
      data: { 
        searchStatus: 'SUPPLIERS_FOUND',
        updatedAt: new Date()
      }
    })
    
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

