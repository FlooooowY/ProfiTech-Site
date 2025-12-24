#!/bin/bash

# Альтернативные методы получения SSL сертификата
# Использование: ./get-ssl-alternative.sh

set -e

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="profitech.store"
WWW_DOMAIN="www.profitech.store"
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"
ACME_DIR="/var/www/html/.well-known/acme-challenge"

echo "🔒 Альтернативные методы получения SSL сертификата..."
echo ""

# 1. Проверка доступности ACME endpoint из интернета
echo "1️⃣ Проверка доступности ACME endpoint из интернета..."
echo ""

# Создаем тестовый файл
TEST_TOKEN="test-$(date +%s)"
echo "$TEST_TOKEN" | sudo tee "$ACME_DIR/$TEST_TOKEN" > /dev/null
sudo chown www-data:www-data "$ACME_DIR/$TEST_TOKEN"
sudo chmod 644 "$ACME_DIR/$TEST_TOKEN"

# Проверяем локально
LOCAL_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/.well-known/acme-challenge/$TEST_TOKEN" 2>/dev/null || echo "000")
DOMAIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/.well-known/acme-challenge/$TEST_TOKEN" 2>/dev/null || echo "000")

if [ "$LOCAL_CODE" = "200" ]; then
    echo "   ✅ Локальный доступ работает (HTTP 200)"
else
    echo "   ⚠️  Локальный доступ: HTTP $LOCAL_CODE"
fi

if [ "$DOMAIN_CODE" = "200" ]; then
    echo "   ✅ Доступ через домен работает (HTTP 200)"
    echo "   ✅ ACME endpoint доступен из интернета!"
    ACME_OK=true
else
    echo "   ⚠️  Доступ через домен: HTTP $DOMAIN_CODE"
    echo "   ⚠️  ACME endpoint может быть недоступен из интернета"
    ACME_OK=false
fi

# Удаляем тестовый файл
sudo rm -f "$ACME_DIR/$TEST_TOKEN"
echo ""

# 2. Проверка DNS через публичные серверы
echo "2️⃣ Проверка DNS через публичные серверы..."
GOOGLE_IP=$(dig @8.8.8.8 +short "$DOMAIN" A 2>/dev/null | head -1)
CF_IP=$(dig @1.1.1.1 +short "$DOMAIN" A 2>/dev/null | head -1)

if [ -n "$GOOGLE_IP" ] && [ "$GOOGLE_IP" = "82.26.91.241" ]; then
    echo "   ✅ Google DNS видит правильный IP: $GOOGLE_IP"
    DNS_OK=true
elif [ -z "$GOOGLE_IP" ]; then
    echo "   ❌ Google DNS не видит A-запись (SERVFAIL)"
    DNS_OK=false
else
    echo "   ⚠️  Google DNS видит другой IP: $GOOGLE_IP"
    DNS_OK=false
fi

if [ -n "$CF_IP" ] && [ "$CF_IP" = "82.26.91.241" ]; then
    echo "   ✅ Cloudflare DNS видит правильный IP: $CF_IP"
else
    echo "   ⚠️  Cloudflare DNS: $([ -n "$CF_IP" ] && echo "видит $CF_IP" || echo "не видит A-запись")"
fi
echo ""

# 3. Метод 1: Standalone (если порт 80 свободен)
echo "3️⃣ Метод 1: Standalone (временно останавливает Nginx)..."
echo "   💡 Этот метод временно останавливает Nginx и использует порт 80"
echo "   💡 Certbot сам создаст временный веб-сервер для проверки"
echo ""
read -p "   Попробовать этот метод? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "   🔄 Остановка Nginx..."
    sudo systemctl stop nginx
    
    echo "   🔄 Получение сертификата через standalone..."
    sudo certbot certonly --standalone \
      -d "$DOMAIN" \
      -d "$WWW_DOMAIN" \
      --non-interactive \
      --agree-tos \
      --email admin@$DOMAIN \
      --preferred-challenges http
    
    CERT_RESULT=$?
    
    echo "   🔄 Запуск Nginx..."
    sudo systemctl start nginx
    
    if [ $CERT_RESULT -eq 0 ]; then
        echo "   ✅ Сертификат успешно получен!"
        echo ""
        echo "   📝 Теперь нужно настроить Nginx для HTTPS"
        echo "   Запустите: npm run ssl:configure-nginx"
        exit 0
    else
        echo "   ❌ Не удалось получить сертификат через standalone"
    fi
fi
echo ""

# 4. Метод 2: Webroot с принудительным HTTP (без DNS проверки)
echo "4️⃣ Метод 2: Webroot с принудительным HTTP challenge..."
if [ "$ACME_OK" = true ]; then
    echo "   ✅ ACME endpoint доступен, пробуем webroot..."
    echo ""
    
    # Пробуем получить сертификат с явным указанием HTTP challenge
    sudo certbot certonly --webroot \
      -w /var/www/html \
      -d "$DOMAIN" \
      -d "$WWW_DOMAIN" \
      --non-interactive \
      --agree-tos \
      --email admin@$DOMAIN \
      --preferred-challenges http \
      --force-renewal
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Сертификат успешно получен!"
        echo ""
        echo "   📝 Теперь нужно настроить Nginx для HTTPS"
        echo "   Запустите: npm run ssl:configure-nginx"
        exit 0
    else
        echo "   ❌ Не удалось получить сертификат"
    fi
else
    echo "   ⚠️  ACME endpoint недоступен, пропускаем"
fi
echo ""

# 5. Метод 3: Ручная настройка (если автоматические методы не работают)
echo "5️⃣ Метод 3: Ручная настройка сертификата..."
echo "   💡 Если автоматические методы не работают, можно:"
echo ""
echo "   1. Подождать 1-2 часа для полного распространения DNS"
echo "   2. Использовать другой сервис для получения сертификата:"
echo "      - ZeroSSL (https://zerossl.com/)"
echo "      - Cloudflare (если используете их DNS)"
echo "   3. Использовать самоподписанный сертификат (для тестирования):"
echo "      sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
echo "        -keyout /etc/ssl/private/nginx-selfsigned.key \\"
echo "        -out /etc/ssl/certs/nginx-selfsigned.crt"
echo ""

# 6. Проверка существующих сертификатов
echo "6️⃣ Проверка существующих сертификатов..."
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "   ✅ Сертификат уже существует!"
    echo "   📍 Путь: /etc/letsencrypt/live/$DOMAIN"
    echo ""
    echo "   💡 Можно настроить Nginx для использования существующего сертификата:"
    echo "      npm run ssl:configure-nginx"
else
    echo "   ℹ️  Сертификат не найден"
fi
echo ""

# Итоговые рекомендации
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Рекомендации:"
echo ""

if [ "$DNS_OK" = false ]; then
    echo "   ⚠️  DNS записи еще не распространились на все серверы"
    echo "   💡 Подождите 1-2 часа и попробуйте снова"
    echo ""
fi

if [ "$ACME_OK" = false ]; then
    echo "   ⚠️  ACME endpoint недоступен из интернета"
    echo "   💡 Проверьте:"
    echo "      - Nginx запущен: sudo systemctl status nginx"
    echo "      - Порт 80 открыт: sudo ufw status"
    echo "      - Блок ACME challenge настроен правильно"
    echo ""
fi

echo "   💡 Попробуйте метод Standalone (остановит Nginx на несколько секунд):"
echo "      sudo systemctl stop nginx"
echo "      sudo certbot certonly --standalone -d $DOMAIN -d $WWW_DOMAIN"
echo "      sudo systemctl start nginx"
echo ""
echo "   💡 Или подождите и попробуйте снова через час:"
echo "      npm run ssl:get-webroot"
echo ""

