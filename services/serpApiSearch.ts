import { SearchResult } from '@/types/search';

export interface SerpApiResult {
  title: string;
  link: string;
  source?: string;
  snippet?: string;
  rich_snippet?: {
    bottom?: {
      extensions?: string[];
    };
  };
}

export interface SerpApiResponse {
  organic_results?: SerpApiResult[];
  search_metadata?: {
    status: string;
    total_results?: number;
  };
}

export class SerpApiService {
  private apiKey: string;
  private baseUrl = 'https://serpapi.com/search.json';

  constructor() {
    this.apiKey = process.env.SERPAPI_KEY || '';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async search(queryText: string, timeout: number = 30000): Promise<SerpApiResult[]> {
    if (!this.isConfigured()) {
      console.warn('SerpAPI is not configured. Skipping search.');
      return [];
    }

    console.log(`SerpAPI: Starting search for "${queryText}"`);
    const startTime = Date.now();

    try {
      const params = new URLSearchParams({
        q: queryText,
        hl: 'ru',
        gl: 'kz',
        api_key: this.apiKey,
        engine: 'google',
        num: '20' // Получаем до 20 результатов
      });

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: AbortSignal.timeout(timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: SerpApiResponse = await response.json();
      
      if (data.search_metadata?.status !== 'Success') {
        throw new Error(`SerpAPI search failed: ${data.search_metadata?.status || 'Unknown error'}`);
      }

      const organicResults = data.organic_results || [];
      const elapsedTime = (Date.now() - startTime) / 1000;
      
      console.log(`SerpAPI: Successfully fetched ${organicResults.length} results in ${elapsedTime}s`);
      
      // Логируем результаты для отладки
      console.log('📊 SerpAPI RESULTS:');
      organicResults.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.title}`);
        console.log(`     🔗 ${result.link}`);
        if (result.rich_snippet?.bottom?.extensions) {
          const priceExt = result.rich_snippet.bottom.extensions.find(ext => 
            ext.includes('₸') || ext.includes('₽') || ext.includes('грн') || ext.includes('$')
          );
          if (priceExt) {
            console.log(`     💰 ${priceExt}`);
          }
        }
      });

      return organicResults;

    } catch (error) {
      const elapsedTime = (Date.now() - startTime) / 1000;
      console.error(`SerpAPI error after ${elapsedTime}s:`, error);
      throw error;
    }
  }
}

export function convertSerpApiResults(serpResults: SerpApiResult[]): SearchResult[] {
  return serpResults.map(result => {
    // Извлекаем цену из rich_snippet если есть
    let price: string | undefined;
    if (result.rich_snippet?.bottom?.extensions) {
      const priceExt = result.rich_snippet.bottom.extensions.find(ext => 
        ext.includes('₸') || ext.includes('₽') || ext.includes('грн') || ext.includes('$')
      );
      if (priceExt) {
        price = priceExt;
      }
    }

    // Извлекаем название компании из источника или домена
    let companyName = result.source;
    if (!companyName && result.link) {
      try {
        const url = new URL(result.link);
        companyName = url.hostname.replace('www.', '');
      } catch (e) {
        companyName = 'Unknown';
      }
    }

    return {
      title: result.title || 'SerpAPI Result',
      url: result.link || '',
      snippet: result.snippet || '',
      price: price,
      companyName: companyName,
      description: result.snippet,
      source: 'serpapi'
    };
  });
}
