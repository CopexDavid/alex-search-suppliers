export interface ExtractedContacts {
  phones: string[];
  emails: string[];
  website?: string;
}

export function extractContacts(text: string): ExtractedContacts {
  const phones = text.match(/(?:\+7|8)[\s(]*\d{3}[\s)]*\d{3}[\s-]?\d{2}[\s-]?\d{2}/g) || [];
  const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const websiteMatch = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/);
  
  return {
    phones: [...new Set(phones)],
    emails: [...new Set(emails)],
    website: websiteMatch ? websiteMatch[0] : undefined,
  };
}

export function isWhatsAppNumber(phone: string): boolean {
  // В реальном приложении здесь должна быть проверка через WhatsApp Business API
  // Для демо возвращаем случайный результат
  return Math.random() > 0.3;
} 