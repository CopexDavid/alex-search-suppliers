import OpenAI from 'openai';
import { NextResponse } from 'next/server';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    'OpenAI-Beta': 'assistants=v2'
  }
});

const SYSTEM_PROMPT = `Ты - ассистент по составлению коммерческих сообщений для компании TOO Alex. 
Твоя задача - генерировать профессиональные, вежливые сообщения для WhatsApp от имени менеджера по закупкам Дастана.

ФОРМАТ СООБЩЕНИЯ:
1. Приветствие
2. Представление: "Меня зовут Дастан, я менеджер по закупкам компании TOO Alex"
3. Основной запрос о товаре
4. Запрос информации о:
   - ценах
   - наличии на складе
   - условиях поставки
5. Просьба о коммерческом предложении
6. Вежливое завершение

ВАЖНЫЕ ПРАВИЛА:
- Сообщение должно быть на русском языке
- Тон: деловой, но не слишком формальный (это для WhatsApp)
- Длина: краткая, но информативная (максимум 500 символов)
- Всегда упоминать возможность оптовых закупок
- Не использовать сложные канцеляризмы
- Сохранять дружелюбный, но профессиональный тон

ЧЕГО ИЗБЕГАТЬ:
❌ "Уважаемые господа..."
❌ "На основании вышеизложенного..."
❌ "В соответствии с договором..."
❌ Слишком длинные предложения
❌ Излишне формальный тон
❌ Агрессивные продажи или срочные запросы`;

export async function POST(request: Request) {
  try {
    const { product } = await request.json();

    if (!product) {
      return NextResponse.json(
        { error: 'Product parameter is required' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: `Сгенерируй сообщение для запроса товара: ${product}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const message = completion.choices[0]?.message?.content;
    
    if (!message) {
      throw new Error('No message generated');
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate message' },
      { status: 500 }
    );
  }
} 