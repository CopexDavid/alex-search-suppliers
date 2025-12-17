// Простой кэш для результатов поиска в памяти
// В продакшене лучше использовать Redis

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // время жизни в миллисекундах
}

class SearchCache {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 минут

  /**
   * Генерирует ключ кэша на основе параметров поиска
   */
  private generateKey(query: string, region: string, categories: string[]): string {
    const sortedCategories = [...categories].sort();
    return `search:${query}:${region}:${sortedCategories.join(',')}`;
  }

  /**
   * Получает данные из кэша
   */
  get(query: string, region: string, categories: string[] = []): any | null {
    const key = this.generateKey(query, region, categories);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Проверяем, не истекло ли время жизни
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    console.log(`🎯 Cache HIT for: ${key}`);
    return entry.data;
  }

  /**
   * Сохраняет данные в кэш
   */
  set(query: string, region: string, categories: string[] = [], data: any, ttl?: number): void {
    const key = this.generateKey(query, region, categories);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    };

    this.cache.set(key, entry);
    console.log(`💾 Cache SET for: ${key}`);

    // Очищаем старые записи (простая очистка)
    this.cleanup();
  }

  /**
   * Очищает устаревшие записи из кэша
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });

    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Очищает весь кэш
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  /**
   * Получает статистику кэша
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Экспортируем единственный экземпляр
export const searchCache = new SearchCache();
