// API для поиска поставщиков по конкретной позиции заявки (используя Puppeteer)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import puppeteer from 'puppeteer'

const SEARCH_ENGINE_ID = 'd7065ea5c59764932'

interface SearchParams {
  params: {
    id: string
    positionId: string
  }
}

/**
 * Парсит контакты с сайта
 */
async function parseContacts(url: string): Promise<any> {
  try {
    const response = await fetch('http://localhost:3000/api/parse-contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    return data.data || {
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
      companyName: '',
      prices: []
    }
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
    
    // ПАРСИМ через Puppeteer (как в /api/search)
    try {
      const searchUrl = `https://cse.google.com/cse?cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}`
      console.log(`🌐 Opening browser: ${searchUrl}`)
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      
      const page = await browser.newPage()
      
      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      })
      
      await page.waitForSelector('.gs-webResult', { timeout: 10000 }).catch(() => {
        console.log('⚠️  No results found or timeout')
      })
      
      // ПАРСИМ НЕСКОЛЬКО СТРАНИЦ (до 3 страниц = 30 результатов)
      const allPageResults: any[] = []
      const maxPages = 3
      
      for (let pageNum = 0; pageNum < maxPages; pageNum++) {
        console.log(`  📄 Page ${pageNum + 1}/${maxPages}`)
        
        const pageResults = await page.evaluate(() => {
          const items: any[] = []
          const resultElements = document.querySelectorAll('.gs-webResult')
          
          resultElements.forEach((el) => {
            const titleEl = el.querySelector('.gs-title') as HTMLElement
            const linkEl = titleEl?.querySelector('a') as HTMLAnchorElement
            const snippetEl = el.querySelector('.gs-snippet') as HTMLElement
            
            if (linkEl && linkEl.href) {
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
        console.log(`    ✓ Found ${pageResults.length} results on page ${pageNum + 1}`)
        
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
            console.log(`    ⚠️  No more pages available`)
            break
          }
          
          // Ждём загрузки следующей страницы
          await new Promise(resolve => setTimeout(resolve, 2000))
          await page.waitForSelector('.gs-webResult', { timeout: 5000 }).catch(() => {})
        }
      }
      
      await browser.close()
      
      // Обрабатываем результаты
      for (const result of allPageResults) {
        if (!result.url || allResults.has(result.url)) continue
        
        allResults.set(result.url, {
          url: result.url,
          title: result.title,
          snippet: result.snippet,
          price: result.price,
          companyName: result.title,
          description: result.snippet,
        })
        
        if (allResults.size >= 30) break
      }
      
      console.log(`\n✅ Found ${allResults.size} unique websites`)
      
    } catch (error) {
      console.error(`❌ Browser error:`, error)
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
    
    // Парсим контакты параллельно
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
      }
    })
    
    const searchResults = await Promise.all(parsePromises)
    
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
    console.error('Search error:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка при поиске поставщиков' },
      { status: 500 }
    )
  }
}

