import { google } from 'googleapis';
import { GOOGLE_CONFIG } from '@/config/google';

const customsearch = google.customsearch('v1');

export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  pagemap?: {
    metatags?: Array<{
      [key: string]: string;
    }>;
  };
}

export async function searchGoogle(query: string): Promise<GoogleSearchResult[]> {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error searching:', error);
    throw error;
  }
} 