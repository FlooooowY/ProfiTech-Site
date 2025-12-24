#!/bin/bash

# Скрипт для исправления ошибки 404 при получении SSL сертификата
# Проблема: Certbot не может получить доступ к /.well-known/acme-challenge/

set -e

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

DOMAIN="profitech.store"
WWW_DOMAIN="www.profitech.store"
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"
ACME_DIR="/var/www/html/.well-known/acme-challenge"

echo "🔧 Исправление проблемы с ACME challenge (404 ошибка)..."
echo ""

# 1. Проверка текущей конфигурации
echo "1️⃣ Проверка текущей конфигурации Nginx..."
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "   ❌ Конфигурация не найдена: $NGINX_CONFIG"
    echo "   💡 Сначала запустите: npm run domain:setup $DOMAIN"
    exit 1
fi

echo "   ✅ Конфигурация найдена"
echo ""

# 2. Проверка блока ACME challenge
echo "2️⃣ Проверка блока ACME challenge..."
if grep -q "\.well-known/acme-challenge" "$NGINX_CONFIG"; then
    echo "   ✅ Блок ACME challenge найден"
    
    # Проверяем, что блок находится ПЕРЕД location /
    ACME_LINE=$(grep -n "\.well-known/acme-challenge" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    LOCATION_LINE=$(grep -n "^[[:space:]]*location /" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    
    if [ -n "$ACME_LINE" ] && [ -n "$LOCATION_LINE" ] && [ "$ACME_LINE" -lt "$LOCATION_LINE" ]; then
        echo "   ✅ Блок находится в правильном месте (перед location /)"
    else
        echo "   ⚠️  Блок находится не в правильном месте"
        echo "   🔧 Перемещаем блок..."
        
        # Создаем резервную копию
        sudo cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Пересоздаем конфигурацию с правильным порядком
        sudo tee "$NGINX_CONFIG" > /dev/null <<'EOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER WWW_DOMAIN_PLACEHOLDER;
    
    # ВАЖНО: Блок для Let's Encrypt ACME challenge (должен быть ПЕРЕД location /)
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }
    
    # Проксирование на Next.js приложение
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
    
    # Кэширование статических файлов Next.js
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
    
    # Кэширование загруженных файлов
    location /uploads {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400";
    }
    
    # Максимальный размер загружаемых файлов
    client_max_body_size 50M;
}
EOF
        
        # Заменяем плейсхолдеры
        sudo sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$NGINX_CONFIG"
        sudo sed -i "s/WWW_DOMAIN_PLACEHOLDER/$WWW_DOMAIN/g" "$NGINX_CONFIG"
        
        echo "   ✅ Конфигурация пересоздана"
    fi
else
    echo "   ❌ Блок ACME challenge не найден"
    echo "   🔧 Добавляем блок..."
    
    # Создаем резервную копию
    sudo cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Добавляем блок ПЕРЕД location /
    sudo sed -i '/^[[:space:]]*location \//i\    # ВАЖНО: Блок для Let'\''s Encrypt ACME challenge (должен быть ПЕРЕД location /)\n    location /.well-known/acme-challenge/ {\n        root /var/www/html;\n        try_files $uri =404;\n    }\n' "$NGINX_CONFIG"
    
    echo "   ✅ Блок добавлен"
fi
echo ""

# 3. Создание директории для ACME challenge
echo "3️⃣ Создание директории для ACME challenge..."
sudo mkdir -p "$ACME_DIR"
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# Создаем тестовый файл
TEST_FILE="$ACME_DIR/test.txt"
echo "test" | sudo tee "$TEST_FILE" > /dev/null
sudo chown www-data:www-data "$TEST_FILE"
sudo chmod 644 "$TEST_FILE"

echo "   ✅ Директория создана: $ACME_DIR"
echo "   ✅ Права установлены"
echo ""

# 4. Проверка доступности директории
echo "4️⃣ Проверка доступности директории..."
if [ -f "$TEST_FILE" ] && [ -r "$TEST_FILE" ]; then
    echo "   ✅ Тестовый файл доступен"
    sudo rm -f "$TEST_FILE"
else
    echo "   ⚠️  Проблемы с доступом к директории"
fi
echo ""

# 5. Проверка синтаксиса Nginx
echo "5️⃣ Проверка синтаксиса Nginx..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Синтаксис корректен"
else
    echo "   ❌ Ошибки в конфигурации:"
    sudo nginx -t
    exit 1
fi
echo ""

# 6. Перезагрузка Nginx
echo "6️⃣ Перезагрузка Nginx..."
sudo systemctl reload nginx
echo "   ✅ Nginx перезагружен"
echo ""

# 7. Тест доступности ACME endpoint
echo "7️⃣ Тест доступности ACME endpoint..."
sleep 2

# Создаем тестовый файл для проверки
TEST_TOKEN="test-$(date +%s)"
echo "$TEST_TOKEN" | sudo tee "$ACME_DIR/$TEST_TOKEN" > /dev/null
sudo chown www-data:www-data "$ACME_DIR/$TEST_TOKEN"
sudo chmod 644 "$ACME_DIR/$TEST_TOKEN"

# Проверяем доступность
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/.well-known/acme-challenge/$TEST_TOKEN" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ ACME endpoint доступен (HTTP 200)"
    echo "   ✅ Файл успешно прочитан: $TEST_TOKEN"
elif [ "$HTTP_CODE" = "404" ]; then
    echo "   ❌ ACME endpoint возвращает 404"
    echo "   💡 Проверьте конфигурацию Nginx вручную"
else
    echo "   ⚠️  ACME endpoint возвращает HTTP $HTTP_CODE"
fi

# Удаляем тестовый файл
sudo rm -f "$ACME_DIR/$TEST_TOKEN"
echo ""

# 8. Альтернативный метод (webroot)
echo "8️⃣ Информация об альтернативном методе..."
echo "   💡 Если проблема сохраняется, используйте метод webroot:"
echo ""
echo "   sudo certbot certonly --webroot \\"
echo "     -w /var/www/html \\"
echo "     -d $DOMAIN \\"
echo "     -d $WWW_DOMAIN"
echo ""
echo "   Затем добавьте сертификаты в Nginx вручную"
echo ""

# Итоговая информация
echo "✅ Исправление завершено!"
echo ""
echo "📋 Следующие шаги:"
echo ""
echo "1. Проверьте конфигурацию:"
echo "   sudo cat $NGINX_CONFIG | grep -A 5 'acme-challenge'"
echo ""
echo "2. Проверьте доступность:"
echo "   curl http://$DOMAIN/.well-known/acme-challenge/test"
echo ""
echo "3. Попробуйте получить сертификат снова:"
echo "   sudo certbot --nginx -d $DOMAIN -d $WWW_DOMAIN"
echo ""
echo "4. Если проблема сохраняется, используйте webroot метод:"
echo "   sudo certbot certonly --webroot -w /var/www/html -d $DOMAIN -d $WWW_DOMAIN"
echo ""

