import { NextResponse } from 'next/server';
import { SearchResult, SearchResponse } from '@/types/search';
import { parseContactInfo } from '@/utils/parser';

const GOOGLE_API_KEY = 'AIzaSyAtgzKN9vREtdLZuwqQlmSszVKU3DT1Qy8';
const SEARCH_ENGINE_ID = 'd7065ea5c59764932';

// Коммерческие ключевые слова для улучшения поиска
const COMMERCIAL_KEYWORDS = [
  'купить оптом алматы',
  'поставщик алматы',
  'продажа оптом',
  'оптовые поставки',
];

function enhanceSearchQuery(query: string): string {
  // Проверяем, содержит ли запрос уже коммерческие ключевые слова
  const lowerQuery = query.toLowerCase();
  const hasCommercialIntent = COMMERCIAL_KEYWORDS.some(keyword => 
    lowerQuery.includes(keyword.toLowerCase())
  );

  // Если запрос уже содержит коммерческие ключевые слова, оставляем как есть
  if (hasCommercialIntent) {
    return query;
  }

  // Добавляем "купить оптом алматы" к запросу
  return `${query} купить оптом алматы`;
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

    console.log('Original search query:', searchQuery);
    
    // Улучшаем поисковый запрос
    const enhancedQuery = enhanceSearchQuery(searchQuery);
    console.log('Enhanced search query:', enhancedQuery);

    // Выполняем поиск через Google Custom Search API
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(enhancedQuery)}&num=10&lr=lang_ru&hl=ru&gl=kz`;

    console.log('Initial search URL:', searchUrl);
    const response = await fetch(searchUrl);
    const data = await response.json();

    console.log('Google API Response:', JSON.stringify(data, null, 2));

    // Проверяем, есть ли исправление запроса и нет результатов
    if (data.spelling?.correctedQuery && (!data.items || data.items.length === 0)) {
      console.log('Using corrected query:', data.spelling.correctedQuery);
      
      // Выполняем новый поиск с исправленным запросом
      const correctedEnhancedQuery = enhanceSearchQuery(data.spelling.correctedQuery);
      const correctedUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(correctedEnhancedQuery)}&num=10&lr=lang_ru&hl=ru&gl=kz`;
      
      const correctedResponse = await fetch(correctedUrl);
      const correctedData = await correctedResponse.json();
      
      if (correctedResponse.ok && correctedData.items) {
        data.items = correctedData.items;
        console.log(`Found ${data.items.length} results with corrected query`);
      }
    }

    if (!response.ok) {
      console.error('Google API error:', data);
      return NextResponse.json(
        { error: 'Failed to fetch search results' },
        { status: response.status }
      );
    }

    console.log(`Found ${data.items?.length || 0} results`);

    // Обработка результатов
    const searchResults: SearchResult[] = [];

    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        console.log('Processing URL:', item.link);
        try {
          // Парсинг контактной информации с сайта
          const contactInfo = await parseContactInfo(item.link);
          searchResults.push({
            url: item.link,
            ...contactInfo,
            title: item.title,
            snippet: item.snippet
          });
        } catch (error) {
          console.error(`Error processing ${item.link}:`, error);
          searchResults.push({
            url: item.link,
            title: item.title,
            snippet: item.snippet,
            foundAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          });
        }
      }
    }

    // Если все еще нет результатов, попробуем более широкий поиск
    if (searchResults.length === 0) {
      console.log('No results found, trying broader search...');
      const broaderQuery = searchQuery.split(' ').slice(0, 2).join(' '); // Используем только первые два слова
      const broaderEnhancedQuery = enhanceSearchQuery(broaderQuery);
      const broaderUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(broaderEnhancedQuery)}&num=10&lr=lang_ru&hl=ru`;
      
      const broaderResponse = await fetch(broaderUrl);
      const broaderData = await broaderResponse.json();
      
      if (broaderResponse.ok && broaderData.items) {
        for (const item of broaderData.items) {
          console.log('Processing URL from broader search:', item.link);
          try {
            const contactInfo = await parseContactInfo(item.link);
            searchResults.push({
              url: item.link,
              ...contactInfo,
              title: item.title,
              snippet: item.snippet
            });
          } catch (error) {
            console.error(`Error processing ${item.link}:`, error);
            searchResults.push({
              url: item.link,
              title: item.title,
              snippet: item.snippet,
              foundAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            });
          }
        }
      }
    }

    const whatsappCount = searchResults.filter(r => r.whatsapp).length;
    console.log(`Successfully processed ${searchResults.length} results (${whatsappCount} with WhatsApp)`);

    const searchResponse: SearchResponse = {
      results: searchResults,
      query: data.spelling?.correctedQuery || searchQuery,
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