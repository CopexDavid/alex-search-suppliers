import axios from 'axios';
import * as cheerio from 'cheerio';
import { SearchResult } from '@/types/search';
import { normalizePhoneNumber } from '@/lib/utils';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function parseContactInfo(url: string): Promise<Partial<SearchResult>> {
  try {
    // Настройка axios с заголовками
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000,
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);
    
    // Поиск email адресов
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const pageText = $('body').text();
    const htmlContent = $('body').html() || '';
    
    const emailsFromText = pageText.match(emailRegex) || [];
    const emailsFromHtml = htmlContent.match(emailRegex) || [];
    const emails = [...new Set([...emailsFromText, ...emailsFromHtml])];
    
    // Поиск телефонных номеров
    const phoneRegexes = [
      /(?:\+7|8)[\s-]?\(?[0-9]{3}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}/g,
      /(?:\+7|8)[\s-]?[0-9]{3}[\s-]?[0-9]{3}[\s-]?[0-9]{4}/g,
      /[+][7]\s?[(]?[0-9]{3}[)]?\s?[0-9]{3}[-]?[0-9]{2}[-]?[0-9]{2}/g,
    ];

    const phones = new Set<string>();
    for (const regex of phoneRegexes) {
      const matches = pageText.match(regex) || [];
      matches.forEach(phone => {
        // Форматируем телефон в единый формат
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 11) {
          const formattedPhone = `+${cleanPhone.slice(0, 1)} (${cleanPhone.slice(1, 4)}) ${cleanPhone.slice(4, 7)}-${cleanPhone.slice(7, 9)}-${cleanPhone.slice(9)}`;
          phones.add(formattedPhone);
        }
      });
    }

    // Поиск WhatsApp - сохраняем только нормализованный номер
    const whatsappNumbers = new Set<string>();
    
    // Ищем ссылки на WhatsApp
    $('a[href*="wa.me"], a[href*="whatsapp.com"], a[href*="api.whatsapp.com"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        // Нормализуем номер из ссылки
        const normalized = normalizePhoneNumber(href);
        if (normalized) {
          whatsappNumbers.add(normalized);
        }
      }
    });

    // Если нашли телефон, но не нашли WhatsApp, используем первый телефон
    if (whatsappNumbers.size === 0 && phones.size > 0) {
      const firstPhone = Array.from(phones)[0];
      const normalized = normalizePhoneNumber(firstPhone);
      if (normalized) {
        whatsappNumbers.add(normalized);
      }
    }

    // Поиск адреса
    const addressSelectors = [
      '*[itemprop="address"]',
      '.contact-address',
      '.address',
      'address',
      '*:contains("адрес")',
      '*:contains("Адрес")',
      '*:contains("местоположение")',
      '*:contains("Местоположение")',
    ];

    let address = '';
    for (const selector of addressSelectors) {
      const elements = $(selector);
      elements.each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 10 && text.length < 200 && 
            (text.toLowerCase().includes('адрес') || 
             text.toLowerCase().includes('г.') || 
             text.toLowerCase().includes('ул.') ||
             text.toLowerCase().includes('алматы'))) {
          address = text.replace(/\s+/g, ' ').trim();
          return false; // Прерываем поиск, если нашли подходящий адрес
        }
      });
      if (address) break;
    }

    // Поиск названия компании
    const companyNameSelectors = [
      '*[itemprop="name"]',
      '.company-name',
      '.org-name',
      'header h1',
      '.logo-text',
      '.brand-name',
      'title'
    ];

    let companyName = '';
    for (const selector of companyNameSelectors) {
      const element = $(selector).first();
      const text = element.text().trim();
      if (text && text.length > 2 && text.length < 100) {
        companyName = text;
        break;
      }
    }

    // Поиск описания деятельности
    const descriptionSelectors = [
      '*[itemprop="description"]',
      '.company-description',
      '.about-company',
      'meta[name="description"]'
    ];

    let description = '';
    for (const selector of descriptionSelectors) {
      const element = $(selector).first();
      const text = element.text() || element.attr('content') || '';
      if (text && text.length > 20) {
        description = text.trim();
        break;
      }
    }

    // Получаем текущее время для поля "Найден в"
    const now = new Date();
    const foundAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    return {
      email: emails[0] || '',
      phone: Array.from(phones)[0] || '',
      whatsapp: Array.from(whatsappNumbers)[0] || '', // Нормализованный номер
      address: address || '',
      companyName: companyName || '',
      description: description || '',
      foundAt
    };
  } catch (error) {
    console.error(`Error parsing ${url}:`, error);
    return {
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
      companyName: '',
      description: '',
      foundAt: ''
    };
  }
} 