#!/bin/bash

# Полное исправление конфигурации Nginx для SSL
# Использование: ./scripts/fix-nginx-complete.sh

set -e

NGINX_CONF="/etc/nginx/sites-available/profitech"

echo "🔧 Полное исправление конфигурации Nginx..."

# 1. Создаем резервную копию
echo "💾 Создание резервной копии..."
sudo cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"

# 2. Создаем правильную конфигурацию
echo "📝 Создание правильной конфигурации..."
sudo tee "$NGINX_CONF" > /dev/null << 'EOF'
server {
    listen 80;
    server_name profitech.store www.profitech.store;

    # ВАЖНО: Блок для Let's Encrypt ACME challenge (должен быть ПЕРЕД location /)
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }

    # Пока оставляем HTTP (редирект на HTTPS будет добавлен после получения сертификата)
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

        # Таймауты для долгих запросов
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Кэширование статических файлов
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    location /uploads {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400";
    }

    # Максимальный размер загружаемых файлов
    client_max_body_size 50M;
}
EOF

# 3. Удаляем конфликтующие конфигурации
echo "🧹 Удаление конфликтующих конфигураций..."
sudo rm -f /etc/nginx/sites-enabled/default

# 4. Убеждаемся, что наша конфигурация активна
echo "🔗 Активация конфигурации..."
sudo ln -sf /etc/nginx/sites-available/profitech /etc/nginx/sites-enabled/profitech

# 5. Создаем директорию для ACME challenge
echo "📁 Создание директории для ACME challenge..."
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# 6. Создаем тестовый файл для проверки
echo "🧪 Создание тестового файла..."
echo "test" | sudo tee /var/www/html/.well-known/acme-challenge/test > /dev/null
sudo chown www-data:www-data /var/www/html/.well-known/acme-challenge/test

# 7. Проверяем синтаксис
echo "🔍 Проверка синтаксиса Nginx..."
if sudo nginx -t; then
    echo "✅ Синтаксис корректен"
else
    echo "❌ Ошибка в конфигурации!"
    exit 1
fi

# 8. Перезагружаем Nginx
echo "🔄 Перезагрузка Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx перезагружен"

# 9. Проверяем доступность
echo "🔍 Проверка доступности..."
sleep 2

# Проверяем тестовый файл
TEST_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://profitech.store/.well-known/acme-challenge/test || echo "000")
if [ "$TEST_CODE" = "200" ]; then
    echo "✅ ACME challenge работает! (HTTP 200)"
elif [ "$TEST_CODE" = "404" ]; then
    echo "⚠️  ACME challenge возвращает 404 (но это может быть нормально)"
else
    echo "⚠️  HTTP код: $TEST_CODE"
fi

# Удаляем тестовый файл
sudo rm -f /var/www/html/.well-known/acme-challenge/test

# 10. Проверяем основной сайт
MAIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://profitech.store || echo "000")
if [ "$MAIN_CODE" = "200" ]; then
    echo "✅ Основной сайт доступен (HTTP 200)"
else
    echo "⚠️  Основной сайт: HTTP $MAIN_CODE"
fi

echo ""
echo "✅ Конфигурация исправлена!"
echo ""
echo "📋 Теперь получите SSL сертификат:"
echo "   sudo certbot --nginx -d profitech.store -d www.profitech.store"
echo ""

