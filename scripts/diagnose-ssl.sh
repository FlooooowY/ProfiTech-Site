#!/bin/bash

# Скрипт для диагностики проблем с SSL сертификатом
# Использование: ./scripts/diagnose-ssl.sh

set -e

echo "🔍 Диагностика проблем с SSL сертификатом..."
echo ""

# 1. Проверка DNS
echo "1️⃣  Проверка DNS..."
echo "   profitech.store:"
nslookup profitech.store | grep -A 1 "Name:" || echo "   ❌ DNS не настроен"
echo "   www.profitech.store:"
nslookup www.profitech.store | grep -A 1 "Name:" || echo "   ❌ DNS не настроен"
echo ""

# 2. Проверка доступности домена
echo "2️⃣  Проверка доступности домена..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://profitech.store || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "   ✅ Домен доступен (HTTP $HTTP_CODE)"
else
    echo "   ❌ Домен недоступен (HTTP $HTTP_CODE)"
fi
echo ""

# 3. Проверка конфигурации Nginx
echo "3️⃣  Проверка конфигурации Nginx..."
NGINX_CONF="/etc/nginx/sites-available/profitech"
if [ -f "$NGINX_CONF" ]; then
    echo "   ✅ Файл конфигурации существует"
    
    if grep -q "\.well-known/acme-challenge" "$NGINX_CONF"; then
        echo "   ✅ Блок ACME challenge найден"
        echo "   Содержимое блока:"
        grep -A 3 "\.well-known/acme-challenge" "$NGINX_CONF" | sed 's/^/      /'
    else
        echo "   ❌ Блок ACME challenge НЕ найден!"
        echo "   Запустите: ./scripts/add-acme-to-nginx.sh"
    fi
else
    echo "   ❌ Файл конфигурации не найден: $NGINX_CONF"
fi
echo ""

# 4. Проверка директории для ACME challenge
echo "4️⃣  Проверка директории для ACME challenge..."
if [ -d "/var/www/html/.well-known/acme-challenge" ]; then
    echo "   ✅ Директория существует"
    echo "   Права доступа:"
    ls -ld /var/www/html/.well-known/acme-challenge | awk '{print "      " $0}'
else
    echo "   ❌ Директория не существует!"
    echo "   Создайте: sudo mkdir -p /var/www/html/.well-known/acme-challenge"
fi
echo ""

# 5. Проверка доступности ACME challenge endpoint
echo "5️⃣  Проверка доступности ACME challenge endpoint..."
TEST_URL="http://profitech.store/.well-known/acme-challenge/test"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TEST_URL" || echo "000")
if [ "$HTTP_CODE" = "404" ]; then
    echo "   ✅ Endpoint доступен (404 - это нормально для тестового файла)"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "   ❌ Endpoint недоступен (connection refused)"
    echo "   Проверьте, что Nginx запущен: sudo systemctl status nginx"
elif [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "503" ]; then
    echo "   ⚠️  Endpoint возвращает $HTTP_CODE (проблема с прокси)"
else
    echo "   ⚠️  Неожиданный HTTP код: $HTTP_CODE"
fi
echo ""

# 6. Проверка статуса Nginx
echo "6️⃣  Проверка статуса Nginx..."
if sudo systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx запущен"
    
    # Проверка синтаксиса
    if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
        echo "   ✅ Синтаксис конфигурации корректен"
    else
        echo "   ❌ Ошибка в конфигурации!"
        sudo nginx -t
    fi
else
    echo "   ❌ Nginx не запущен!"
    echo "   Запустите: sudo systemctl start nginx"
fi
echo ""

# 7. Проверка файрвола
echo "7️⃣  Проверка файрвола..."
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null | head -1)
    echo "   Статус: $UFW_STATUS"
    if echo "$UFW_STATUS" | grep -q "inactive"; then
        echo "   ℹ️  Файрвол неактивен (это нормально)"
    else
        if sudo ufw status | grep -q "80/tcp"; then
            echo "   ✅ Порт 80 открыт"
        else
            echo "   ⚠️  Порт 80 может быть закрыт"
            echo "   Откройте: sudo ufw allow 80/tcp"
        fi
    fi
else
    echo "   ℹ️  UFW не установлен"
fi
echo ""

# 8. Проверка из интернета (через внешний сервис)
echo "8️⃣  Проверка доступности из интернета..."
echo "   Проверяю через внешний сервис..."
EXTERNAL_CHECK=$(curl -s "https://www.whatsmydns.net/api/details?recordType=A&query=profitech.store" 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 || echo "")
if [ -n "$EXTERNAL_CHECK" ]; then
    echo "   $EXTERNAL_CHECK"
fi
echo ""

# 9. Рекомендации
echo "📋 Рекомендации:"
echo ""

if ! grep -q "\.well-known/acme-challenge" "$NGINX_CONF" 2>/dev/null; then
    echo "   ❌ Добавьте блок ACME challenge:"
    echo "      ./scripts/add-acme-to-nginx.sh"
    echo ""
fi

if [ ! -d "/var/www/html/.well-known/acme-challenge" ]; then
    echo "   ❌ Создайте директорию:"
    echo "      sudo mkdir -p /var/www/html/.well-known/acme-challenge"
    echo "      sudo chown -R www-data:www-data /var/www/html"
    echo "      sudo chmod -R 755 /var/www/html"
    echo ""
fi

if [ "$HTTP_CODE" != "404" ] && [ "$HTTP_CODE" != "200" ]; then
    echo "   ⚠️  Проверьте доступность домена из интернета:"
    echo "      curl -I http://profitech.store"
    echo ""
fi

echo "   После исправления проблем попробуйте:"
echo "      sudo certbot --nginx -d profitech.store -d www.profitech.store"
echo ""

