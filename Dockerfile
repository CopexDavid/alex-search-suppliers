# Dockerfile для Next.js приложения ALEX
FROM node:18-alpine

# Установка необходимых зависимостей для Prisma и Puppeteer
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    netcat-openbsd

# Установка переменных окружения для Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Копирование файлов зависимостей
COPY package.json package-lock.json* ./

# Установка зависимостей
RUN npm ci

# Копирование остальных файлов
COPY . .

# Копирование скрипта инициализации
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Генерация Prisma Client (перед сборкой)
RUN npx prisma generate

# Сборка Next.js приложения
# Устанавливаем переменные окружения для сборки (некоторые модули требуют их на этапе импорта)
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=true
# Используем фиктивные значения для сборки (реальные будут в runtime через .env)
ENV DATABASE_URL=postgresql://dummy:dummy@postgres:5432/dummy
ENV OPENAI_API_KEY=sk-dummy-key-for-build-only
ENV JWT_SECRET=dummy-secret-for-build
RUN npm run build

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# Использование entrypoint для инициализации БД
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]

