// API для парсинга контактов с сайтов (без cheerio - только regex)
import { NextRequest, NextResponse } from 'next/server'

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    console.log(`📞 Parsing contacts from: ${url}`)

    // Получаем HTML страницы
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(8000), // 8 секунд timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    
    // Email через regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const emails = [...new Set(html.match(emailRegex) || [])]
      .filter(email => 
        !email.includes('.png') && 
        !email.includes('.jpg') &&
        !email.includes('@example') &&
        email.length < 50
      )

    // Телефоны через regex (казахстанские и российские)
    const phoneRegexes = [
      /\+7[\s-]?\(?[0-9]{3}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}/g,
      /8[\s-]?\(?[0-9]{3}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}/g,
      /\+7[\s-]?[0-9]{3}[\s-]?[0-9]{3}[\s-]?[0-9]{4}/g,
    ]

    const phones = new Set<string>()
    for (const regex of phoneRegexes) {
      const matches = html.match(regex) || []
      matches.forEach(phone => {
        const clean = phone.replace(/\D/g, '')
        if (clean.length === 11 || clean.length === 10) {
          // Нормализуем
          const normalized = clean.length === 10 ? `7${clean}` : clean
          const formatted = `+${normalized.slice(0, 1)} (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7, 9)}-${normalized.slice(9)}`
          phones.add(formatted)
        }
      })
    }

    // WhatsApp ссылки
    const whatsappRegex = /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\/[0-9]+/g
    const whatsappLinks = [...new Set(html.match(whatsappRegex) || [])]

    // Если нет WhatsApp, но есть телефон - создаем ссылку
    if (whatsappLinks.length === 0 && phones.size > 0) {
      const firstPhone = Array.from(phones)[0]
      const cleanPhone = firstPhone.replace(/\D/g, '')
      whatsappLinks.push(`https://wa.me/${cleanPhone}`)
    }

    // Адрес (ищем паттерны)
    const addressPatterns = [
      /(?:г\.|город|city)\s*[А-Яа-яёЁ]+[,\s]+(?:ул\.|улица)\s*[А-Яа-яёЁ\s\d,-]+/g,
      /[А-Яа-яёЁ]+,\s*(?:ул\.|улица)\s*[А-Яа-яёЁ\s\d,-]+/g,
      /Адрес:\s*([^<>\n]{20,150})/gi,
    ]
    
    let address = ''
    for (const pattern of addressPatterns) {
      const matches = html.match(pattern)
      if (matches && matches[0]) {
        address = matches[0].replace(/<[^>]*>/g, '').trim()
        if (address.length > 15 && address.length < 200) break
      }
    }

    // Название компании (из title или og:title)
    let companyName = ''
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) {
      companyName = titleMatch[1]
        .replace(/\s*\|.*$/, '') // Убираем " | Site Name"
        .replace(/\s*-.*$/, '') // Убираем " - Site Name"
        .trim()
        .substring(0, 100)
    }

    // Парсим ЦЕНЫ с сайта
    const pricePatterns = [
      // Казахстанские тенге: 10 000 ₸, 10000 тг, 10 000 тенге
      /(\d[\d\s]*(?:[\.,]\d+)?)\s*(?:₸|тг\.?|тенге)/gi,
      // Российские рубли: 1000 руб, 1 000 ₽
      /(\d[\d\s]*(?:[\.,]\d+)?)\s*(?:руб\.?|₽|рублей?)/gi,
      // Доллары: $100, 100 USD
      /(?:\$|USD)\s*(\d[\d\s]*(?:[\.,]\d+)?)/gi,
      /(\d[\d\s]*(?:[\.,]\d+)?)\s*(?:USD|\$)/gi,
      // Цена: 10000
      /(?:цена|price|стоимость|от)[\s:]*(\d[\d\s]{2,}(?:[\.,]\d+)?)/gi,
    ]
    
    const prices: string[] = []
    for (const pattern of pricePatterns) {
      const matches = html.matchAll(pattern)
      for (const match of matches) {
        const priceText = match[0].trim()
        // Фильтруем слишком маленькие/большие числа
        const numericValue = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'))
        if (numericValue >= 10 && numericValue <= 10000000) {
          prices.push(priceText)
        }
      }
    }
    
    // Берем первые 3 уникальные цены
    const uniquePrices = [...new Set(prices)].slice(0, 3)

    const result = {
      email: emails[0] || '',
      phone: Array.from(phones)[0] || '',
      whatsapp: whatsappLinks[0] || '',
      address: address || '',
      companyName: companyName || '',
      prices: uniquePrices, // Массив найденных цен
    }

    const hasContacts = result.phone || result.email || result.whatsapp
    console.log(`${hasContacts ? '✅' : '❌'} ${url}: phone=${!!result.phone}, email=${!!result.email}, whatsapp=${!!result.whatsapp}`)

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error: any) {
    console.error(`❌ Parse error: ${error.message}`)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      data: {
        email: '',
        phone: '',
        whatsapp: '',
        address: '',
        companyName: '',
        prices: [],
      }
    })
  }
}
