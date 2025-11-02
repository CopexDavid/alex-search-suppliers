# ⚠️ Решение конфликта портов

## Проблема

На сервере уже запущен системный nginx на порту 80, что конфликтует с nginx из docker-compose.

## Решения

### Вариант 1: Остановить системный nginx (рекомендуется)

Использовать nginx из docker-compose:

```bash
# Остановить системный nginx
sudo systemctl stop nginx
sudo systemctl disable nginx

# Проверить, что порт 80 свободен
sudo netstat -tlnp | grep :80

# Теперь можно запускать docker-compose
cd /root/alex
docker-compose up -d
```

### Вариант 2: Изменить порты в docker-compose.yml

Использовать другие порты для docker nginx (например, 8080, 8443):

```bash
cd /root/alex

# Отредактировать docker-compose.yml
# В разделе nginx изменить:
# ports:
#   - "8080:80"   # HTTP
#   - "8443:443"  # HTTPS

# Затем запустить
docker-compose up -d
```

**После этого:**
- HTTP: http://alexautozakup.kz:8080
- HTTPS: https://alexautozakup.kz:8443

### Вариант 3: Использовать системный nginx как reverse proxy

Настроить системный nginx для проксирования на docker контейнер:

1. Создайте конфигурацию nginx для домена:

```bash
sudo nano /etc/nginx/sites-available/alexautozakup.kz
```

2. Добавьте конфигурацию:

```nginx
server {
    listen 80;
    server_name alexautozakup.kz www.alexautozakup.kz;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Активируйте конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/alexautozakup.kz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. Обновите docker-compose.yml:

```yaml
# Уберите nginx из docker-compose.yml
# И оставьте только app и postgres
# Порт 3000 должен быть открыт:
ports:
  - "3000:3000"
```

5. Запустите docker-compose без nginx:

```bash
docker-compose up -d postgres app
```

## Рекомендация

**Рекомендую Вариант 1** - остановить системный nginx и использовать nginx из docker-compose, так как:
- Все настройки централизованы в docker-compose
- Проще управление SSL сертификатами через certbot в docker
- Легче обновление и миграция
- Изолированность контейнеров

## После выбора варианта

Следуйте инструкциям в `QUICK_START.md` для запуска проекта.

