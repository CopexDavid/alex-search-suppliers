import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Нормализует номер телефона к единому формату
 * Приводит к формату: только цифры, начинается с 7 (для казахстанских/российских номеров)
 * 
 * Примеры:
 * +77471233323 -> 77471233323
 * 87471233323 -> 77471233323
 * 77471233323 -> 77471233323
 * +7 (747) 123-33-23 -> 77471233323
 * 77471233323@s.whatsapp.net -> 77471233323
 */
export function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Убираем WhatsApp суффиксы
  let cleaned = phone.replace(/@[sc]\.whatsapp\.net$/i, '');
  
  // Оставляем только цифры
  cleaned = cleaned.replace(/\D/g, '');
  
  // Если начинается с 8, заменяем на 7 (для России/Казахстана)
  if (cleaned.startsWith('8') && cleaned.length === 11) {
    cleaned = '7' + cleaned.slice(1);
  }
  
  // Если номер короткий (10 цифр без кода страны), добавляем 7
  if (cleaned.length === 10) {
    cleaned = '7' + cleaned;
  }
  
  return cleaned;
}

/**
 * Создаёт варианты номера телефона для поиска в базе
 * Возвращает массив возможных форматов для поиска
 */
export function getPhoneNumberVariants(phone: string): string[] {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return [];
  
  const variants = new Set<string>();
  
  // Основной нормализованный формат
  variants.add(normalized);
  
  // С плюсом
  variants.add('+' + normalized);
  
  // Для WhatsApp формата
  variants.add(normalized + '@s.whatsapp.net');
  variants.add(normalized + '@c.us');
  
  // Если начинается с 7, добавляем вариант с 8
  if (normalized.startsWith('7') && normalized.length === 11) {
    variants.add('8' + normalized.slice(1));
    variants.add('+8' + normalized.slice(1));
  }
  
  return Array.from(variants);
}
