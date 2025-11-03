import { SearchResult } from '@/types/search';

export interface YandexSearchResult {
  url: string;
  title: string;
  snippet: string;
  source: 'yandex';
}

/**
 * Сервис для работы с Yandex Search API
 */
export class YandexSearchService {
  private apiKey: string;
  private folderId: string;
  private baseUrl = 'https://searchapi.api.yandexcloud.kz/v2/web/searchAsync';
  private operationsUrl = 'https://operation.api.yandexcloud.kz/operations';

  constructor() {
    this.apiKey = process.env.YANDEX_SEARCH_API_KEY || '';
    this.folderId = process.env.YANDEX_FOLDER_ID || '';
    
    if (!this.apiKey || !this.folderId) {
      console.warn('⚠️  Yandex Search API credentials not configured');
    }
  }

  /**
   * Проверяет, настроен ли Yandex Search API
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.folderId);
  }

  /**
   * Создает поисковый запрос в Yandex Search API
   */
  async createSearchRequest(query: string): Promise<string | null> {
    if (!this.isConfigured()) {
      console.log('❌ Yandex Search API not configured');
      return null;
    }

    try {
      console.log(`🔍 Creating Yandex search request for: "${query}"`);

      const requestBody = {
        query: {
          searchType: "SEARCH_TYPE_RU",
          queryText: query
        },
        folderId: this.folderId,
        responseFormat: "FORMAT_HTML",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 YaBrowser/25.2.0.0 Safari/537.36"
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Api-Key ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Yandex search request created: ${result.id}`);
      
      return result.id;
    } catch (error) {
      console.error('❌ Error creating Yandex search request:', error);
      return null;
    }
  }

  /**
   * Проверяет статус операции и получает результат
   */
  async getSearchResult(operationId: string): Promise<YandexSearchResult[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      console.log(`⏳ Checking Yandex operation status: ${operationId}`);

      const response = await fetch(`${this.operationsUrl}/${operationId}`, {
        headers: {
          'Authorization': `Api-Key ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const operation = await response.json();
      
      if (!operation.done) {
        console.log('⏳ Yandex operation still in progress...');
        return [];
      }

      if (operation.error) {
        console.error('❌ Yandex operation failed:', operation.error);
        return [];
      }

      if (!operation.response?.rawData) {
        console.log('⚠️  No raw data in Yandex response');
        return [];
      }

      // Декодируем Base64 результат
      const htmlData = Buffer.from(operation.response.rawData, 'base64').toString('utf-8');
      console.log(`✅ Yandex search completed, parsing HTML (${htmlData.length} chars)`);

      // Парсим HTML результат
      return this.parseYandexHTML(htmlData);

    } catch (error) {
      console.error('❌ Error getting Yandex search result:', error);
      return [];
    }
  }

  /**
   * Парсит HTML результат от Yandex
   */
  private parseYandexHTML(html: string): YandexSearchResult[] {
    const results: YandexSearchResult[] = [];

    try {
      // Простой парсинг HTML с помощью регулярных выражений
      // В реальном проекте лучше использовать cheerio или jsdom
      
      // Ищем ссылки результатов поиска
      const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
      const snippetRegex = /<div[^>]*class="[^"]*snippet[^"]*"[^>]*>([^<]+)<\/div>/gi;
      
      let linkMatch;
      let index = 0;
      
      while ((linkMatch = linkRegex.exec(html)) !== null && index < 10) {
        const url = linkMatch[1];
        const title = linkMatch[2];
        
        // Пропускаем внутренние ссылки Yandex
        if (url.includes('yandex.') || url.startsWith('/') || url.startsWith('#')) {
          continue;
        }

        // Ищем сниппет для этого результата
        let snippet = '';
        const snippetMatch = snippetRegex.exec(html);
        if (snippetMatch) {
          snippet = snippetMatch[1].replace(/<[^>]*>/g, '').trim();
        }

        results.push({
          url: url.startsWith('http') ? url : `https://${url}`,
          title: title.replace(/<[^>]*>/g, '').trim(),
          snippet: snippet || title,
          source: 'yandex'
        });

        index++;
      }

      console.log(`📊 Parsed ${results.length} results from Yandex HTML`);
      return results;

    } catch (error) {
      console.error('❌ Error parsing Yandex HTML:', error);
      return [];
    }
  }

  /**
   * Выполняет поиск с ожиданием результата
   */
  async search(query: string, maxWaitTime: number = 60000): Promise<YandexSearchResult[]> {
    if (!this.isConfigured()) {
      console.log('⚠️  Yandex Search API not configured, skipping');
      return [];
    }

    try {
      // Создаем запрос
      const operationId = await this.createSearchRequest(query);
      if (!operationId) {
        return [];
      }

      // Ждем результат с интервалами
      const startTime = Date.now();
      const checkInterval = 5000; // Проверяем каждые 5 секунд

      while (Date.now() - startTime < maxWaitTime) {
        const results = await this.getSearchResult(operationId);
        
        if (results.length > 0) {
          console.log(`🎉 Yandex search completed: ${results.length} results`);
          return results;
        }

        // Ждем перед следующей проверкой
        console.log('⏳ Waiting for Yandex results...');
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      console.log('⏰ Yandex search timeout reached');
      return [];

    } catch (error) {
      console.error('❌ Error in Yandex search:', error);
      return [];
    }
  }
}

/**
 * Конвертирует результаты Yandex в формат SearchResult
 */
export function convertYandexResults(yandexResults: YandexSearchResult[]): SearchResult[] {
  return yandexResults.map(result => ({
    title: result.title,
    snippet: result.snippet,
    url: result.url,
    source: 'yandex',
    companyName: extractDomainName(result.url),
    description: result.snippet
  }));
}

/**
 * Извлекает доменное имя из URL
 */
function extractDomainName(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return 'Unknown';
  }
}
