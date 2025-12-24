#!/bin/bash

# Скрипт для настройки SSL сертификата
# Использование: ./scripts/setup-ssl.sh

set -e

echo "🔒 Настройка SSL сертификата для profitech.store"

# 1. Создаем директорию для ACME challenge
echo "📁 Создание директории для ACME challenge..."
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
echo "✅ Директория создана"

# 2. Проверяем конфигурацию Nginx
echo ""
echo "🔍 Проверка конфигурации Nginx..."
NGINX_CONF="/etc/nginx/sites-available/profitech"

if [ ! -f "$NGINX_CONF" ]; then
    echo "❌ Файл $NGINX_CONF не найден!"
    echo "   Создайте его согласно инструкции в docs/NGINX_CONFIG.md"
    exit 1
fi

# Проверяем, есть ли блок для ACME challenge
if ! grep -q "\.well-known/acme-challenge" "$NGINX_CONF"; then
    echo "⚠️  Блок для ACME challenge не найден в конфигурации"
    echo "   Добавляю автоматически..."
    
    # Пытаемся добавить блок автоматически
    if [ -f "./scripts/add-acme-to-nginx.sh" ]; then
        chmod +x ./scripts/add-acme-to-nginx.sh
        ./scripts/add-acme-to-nginx.sh
    else
        echo "   Скрипт add-acme-to-nginx.sh не найден"
        echo "   Добавьте следующий блок ПЕРЕД location /:"
        echo ""
        echo "   location /.well-known/acme-challenge/ {"
        echo "       root /var/www/html;"
        echo "       try_files \$uri =404;"
        echo "   }"
        echo ""
        echo "   Откройте файл: sudo nano $NGINX_CONF"
        exit 1
    fi
else
    echo "✅ Блок для ACME challenge найден"
fi

# 3. Проверяем синтаксис Nginx
echo ""
echo "🔍 Проверка синтаксиса Nginx..."
if sudo nginx -t; then
    echo "✅ Синтаксис корректен"
else
    echo "❌ Ошибка в конфигурации Nginx!"
    exit 1
fi

# 4. Перезагружаем Nginx
echo ""
echo "🔄 Перезагрузка Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx перезагружен"

# 5. Проверяем доступность ACME challenge
echo ""
echo "🔍 Проверка доступности ACME challenge..."
TEST_URL="http://profitech.store/.well-known/acme-challenge/test"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TEST_URL" || echo "000")

if [ "$HTTP_CODE" = "404" ]; then
    echo "✅ ACME challenge доступен (404 - это нормально для тестового файла)"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "⚠️  Не удалось подключиться к домену"
    echo "   Проверьте, что домен доступен из интернета"
else
    echo "ℹ️  HTTP код: $HTTP_CODE"
fi

# 6. Проверяем файрвол
echo ""
echo "🔍 Проверка файрвола..."
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status | grep -c "80/tcp" || echo "0")
    if [ "$UFW_STATUS" = "0" ]; then
        echo "⚠️  Порт 80 не открыт в файрволе"
        echo "   Открываю порт 80..."
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw reload
        echo "✅ Порты открыты"
    else
        echo "✅ Порт 80 открыт"
    fi
else
    echo "ℹ️  UFW не установлен, пропускаем проверку файрвола"
fi

# 7. Получаем сертификат
echo ""
echo "🔒 Получение SSL сертификата..."
echo "   Это может занять несколько минут..."
echo ""

if sudo certbot --nginx -d profitech.store -d www.profitech.store --non-interactive --agree-tos --email admin@profitech.store; then
    echo ""
    echo "✅ SSL сертификат успешно получен!"
    echo ""
    echo "🔍 Проверка HTTPS..."
    curl -I https://profitech.store 2>&1 | head -5 || echo "HTTPS пока не доступен (может потребоваться время)"
    echo ""
    echo "✅ Настройка завершена!"
    echo ""
    echo "📋 Следующие шаги:"
    echo "   1. Проверьте сайт: https://profitech.store"
    echo "   2. Автоматическое обновление уже настроено"
    echo "   3. Проверьте обновление: sudo certbot renew --dry-run"
else
    echo ""
    echo "❌ Не удалось получить сертификат"
    echo ""
    echo "🔍 Диагностика:"
    echo "   1. Проверьте DNS: nslookup profitech.store"
    echo "   2. Проверьте доступность: curl -I http://profitech.store"
    echo "   3. Проверьте логи: sudo tail -f /var/log/letsencrypt/letsencrypt.log"
    echo "   4. См. подробную инструкцию: docs/SSL_TROUBLESHOOTING.md"
    exit 1
fi

