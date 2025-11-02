// Тестовый API для проверки работы Puppeteer
import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function GET() {
  try {
    console.log('🧪 Тестируем Puppeteer...')
    
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
    
    console.log('✅ Браузер запущен')
    
    const page = await browser.newPage()
    console.log('✅ Страница создана')
    
    await page.goto('https://www.google.com', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    })
    
    console.log('✅ Страница загружена')
    
    const title = await page.title()
    console.log(`✅ Заголовок: ${title}`)
    
    await browser.close()
    console.log('✅ Браузер закрыт')
    
    return NextResponse.json({
      success: true,
      message: 'Puppeteer работает корректно!',
      data: {
        title,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error: any) {
    console.error('❌ Ошибка Puppeteer:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
