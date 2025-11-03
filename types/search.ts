export interface SearchResult {
  title: string;
  companyName?: string;
  description?: string;
  snippet?: string;
  url?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  foundAt?: string;
  price?: string | null; // Цена из сниппета Google
  prices?: string[]; // Массив цен с сайта
  source?: string; // Источник: 'google', 'kaspi', 'satu', 'yandex'
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  timestamp: string;
  totalResults: number;
  whatsappCount: number;
} 