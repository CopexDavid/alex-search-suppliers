# 🚨 БЫСТРОЕ ИСПРАВЛЕНИЕ: Поиск не работает

## Проблема

```
❌ Google API error 400: API key not valid. Please pass a valid API key.
✅ Found 0 total suppliers
```

## ✅ Решение (5 минут)

### Шаг 1: Получить Google API ключ

Откройте: https://console.cloud.google.com/

```
1. Создайте проект
2. APIs & Services → Library → Найдите "Custom Search API" → Enable
3. APIs & Services → Credentials → Create Credentials → API Key
4. Скопируйте ключ (выглядит как: AIzaSy...)
```

### Шаг 2: Создать Search Engine

Откройте: https://programmablesearchengine.google.com/

```
1. Add (Добавить)
2. Name: "Alex Search"
3. Search the entire web: ✅
4. Create
5. Скопируйте Search engine ID (выглядит как: a1b2c3d4e5f6g7h8i)
```

### Шаг 3: Обновить .env

```bash
GOOGLE_API_KEY=AIzaSy...ваш_ключ
GOOGLE_SEARCH_ENGINE_ID=ваш_id
```

### Шаг 4: Перезапустить

```bash
# Ctrl+C для остановки
npm run dev
```

## 📖 Подробная инструкция

См. файл `GOOGLE_API_SETUP.md`

---

**Время: 5 минут**  
**Стоимость: Бесплатно (100 запросов/день)**

