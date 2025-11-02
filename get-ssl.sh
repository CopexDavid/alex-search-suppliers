#!/bin/bash
# Скрипт для получения SSL сертификата от Let's Encrypt через certbot

set -e

DOMAIN="alexautozakup.kz"
EMAIL="admin@alexautozakup.kz"

echo "🔒 Получение SSL сертификата для $DOMAIN"
echo "════════════════════════════════════════"

# Проверка доступности домена
echo ""
echo "📌 Проверка доступности домена..."
if curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN | grep -q "200\|301\|302\|307"; then
    echo "✅ Домен доступен по HTTP"
else
    echo "⚠️  Предупреждение: домен может быть недоступен"
    echo "   Проверьте DNS записи и доступность порта 80"
fi

# Проверка, что nginx использует HTTP конфигурацию
echo ""
echo "📌 Проверка конфигурации nginx..."
cd "$(dirname "$0")"

if ! grep -q "nginx-http.conf" docker-compose.yml; then
    echo "⚠️  Nginx не настроен для HTTP. Обновляю docker-compose.yml..."
    sed -i 's|nginx.conf:/etc/nginx/conf.d/default.conf|nginx-http.conf:/etc/nginx/conf.d/default.conf|' docker-compose.yml
    docker-compose restart nginx
    sleep 3
fi

# Перезапуск nginx для применения изменений
echo ""
echo "🔄 Перезапуск nginx..."
docker-compose restart nginx || true
sleep 3

# Получение SSL сертификата
echo ""
echo "🔒 Получение SSL сертификата от Let's Encrypt..."
echo "   Это может занять 1-2 минуты..."
echo ""

docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

# Проверка успешности получения сертификата
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SSL сертификат успешно получен!"
    echo ""
    echo "🔄 Переключение на HTTPS конфигурацию..."
    
    # Обновление docker-compose.yml для использования HTTPS конфигурации
    sed -i 's|nginx-http.conf:/etc/nginx/conf.d/default.conf|nginx.conf:/etc/nginx/conf.d/default.conf|' docker-compose.yml
    
    # Перезапуск nginx
    docker-compose restart nginx
    
    echo ""
    echo "✅ HTTPS настроен!"
    echo ""
    echo "🎉 Готово! Сайт доступен по адресу:"
    echo "   https://$DOMAIN"
    echo "   https://www.$DOMAIN"
    echo ""
    echo "📝 Проверка сертификата:"
    echo "   curl -I https://$DOMAIN"
    echo ""
else
    echo ""
    echo "❌ Ошибка при получении SSL сертификата"
    echo ""
    echo "Возможные причины:"
    echo "  1. Домен недоступен извне"
    echo "  2. Порт 80 закрыт или недоступен"
    echo "  3. DNS записи не настроены"
    echo "  4. Домен уже имеет активный сертификат"
    echo ""
    echo "Проверьте логи:"
    echo "   docker-compose logs certbot"
    exit 1
fi

