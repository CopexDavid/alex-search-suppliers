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
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  timestamp: string;
  totalResults: number;
  whatsappCount: number;
} 