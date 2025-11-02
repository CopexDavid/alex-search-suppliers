#!/bin/sh
set -e

echo "Ожидание подключения к базе данных..."
# Простое ожидание - проверяем доступность порта PostgreSQL через netcat или timeout
timeout 60 sh -c 'until nc -z postgres 5432; do sleep 1; done' || echo "Таймаут ожидания БД, продолжаем..."

echo "База данных доступна!"
echo "Применение схемы базы данных..."

# Применение схемы базы данных
npx prisma db push --skip-generate --accept-data-loss || echo "Ошибка при применении схемы, продолжаем..."

# Генерация Prisma Client (если еще не сгенерирован)
npx prisma generate || echo "Ошибка при генерации Prisma Client, продолжаем..."

# Заполнение начальными данными (если нужно и если скрипт существует)
if [ ! -f /app/.db-seeded ] && [ -f /app/scripts/seed.ts ]; then
  echo "Заполнение базы данных начальными данными..."
  npm run db:seed || echo "Seed завершился с ошибкой, но продолжаем..."
  touch /app/.db-seeded
fi

echo "Инициализация базы данных завершена!"
# Для standalone режима Next.js используем node напрямую
if [ "$1" = "npm" ] && [ "$2" = "start" ]; then
    exec node .next/standalone/server.js
else
    exec "$@"
fi

