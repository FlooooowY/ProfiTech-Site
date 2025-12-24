#!/bin/bash

# Скрипт для получения SSL сертификата через метод webroot
# Этот метод более надежен, чем nginx authenticator

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

echo "🔒 Получение SSL сертификата через метод webroot..."
echo ""

# 1. Проверка директории
echo "1️⃣ Проверка директории для ACME challenge..."
if [ ! -d "$ACME_DIR" ]; then
    echo "   📁 Создание директории..."
    sudo mkdir -p "$ACME_DIR"
fi

sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
echo "   ✅ Директория готова: $ACME_DIR"
echo ""

# 2. Проверка конфигурации Nginx
echo "2️⃣ Проверка конфигурации Nginx..."
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "   ❌ Конфигурация не найдена"
    exit 1
fi

# Проверяем, что блок ACME challenge настроен правильно
if ! grep -q "location /.well-known/acme-challenge/" "$NGINX_CONFIG"; then
    echo "   ⚠️  Блок ACME challenge не найден, добавляем..."
    
    # Создаем резервную копию
    sudo cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Добавляем блок ПЕРЕД location /
    sudo sed -i '/^[[:space:]]*location \//i\    # ВАЖНО: Блок для Let'\''s Encrypt ACME challenge\n    location /.well-known/acme-challenge/ {\n        root /var/www/html;\n        try_files $uri =404;\n    }\n' "$NGINX_CONFIG"
    
    echo "   ✅ Блок добавлен"
fi

# Проверяем, что блок НЕ проксируется
if grep -A 3 "location /.well-known/acme-challenge/" "$NGINX_CONFIG" | grep -q "proxy_pass"; then
    echo "   ⚠️  Блок ACME challenge проксируется! Исправляем..."
    
    # Создаем резервную копию
    sudo cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Пересоздаем блок без proxy_pass
    sudo sed -i '/location \/.well-known\/acme-challenge\//,/^[[:space:]]*}/c\    location /.well-known/acme-challenge/ {\n        root /var/www/html;\n        try_files $uri =404;\n    }' "$NGINX_CONFIG"
    
    echo "   ✅ Блок исправлен"
fi

echo "   ✅ Конфигурация проверена"
echo ""

# 3. Проверка синтаксиса
echo "3️⃣ Проверка синтаксиса Nginx..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Синтаксис корректен"
else
    echo "   ❌ Ошибки в конфигурации:"
    sudo nginx -t
    exit 1
fi
echo ""

# 4. Перезагрузка Nginx
echo "4️⃣ Перезагрузка Nginx..."
sudo systemctl reload nginx
echo "   ✅ Nginx перезагружен"
echo ""

# 5. Тест доступности
echo "5️⃣ Тест доступности ACME endpoint..."
sleep 2

# Создаем тестовый файл
TEST_TOKEN="test-$(date +%s)"
echo "$TEST_TOKEN" | sudo tee "$ACME_DIR/$TEST_TOKEN" > /dev/null
sudo chown www-data:www-data "$ACME_DIR/$TEST_TOKEN"
sudo chmod 644 "$ACME_DIR/$TEST_TOKEN"

# Проверяем через localhost
LOCAL_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/.well-known/acme-challenge/$TEST_TOKEN" 2>/dev/null || echo "000")
# Проверяем через домен
DOMAIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/.well-known/acme-challenge/$TEST_TOKEN" 2>/dev/null || echo "000")

if [ "$LOCAL_CODE" = "200" ]; then
    echo "   ✅ Локальный доступ работает (HTTP 200)"
else
    echo "   ⚠️  Локальный доступ: HTTP $LOCAL_CODE"
fi

if [ "$DOMAIN_CODE" = "200" ]; then
    echo "   ✅ Доступ через домен работает (HTTP 200)"
else
    echo "   ⚠️  Доступ через домен: HTTP $DOMAIN_CODE"
    echo "   💡 Проверьте DNS и доступность домена из интернета"
fi

# Удаляем тестовый файл
sudo rm -f "$ACME_DIR/$TEST_TOKEN"
echo ""

# 6. Проверка IPv6
echo "6️⃣ Проверка IPv6..."
IPV6_ADDRESS=$(curl -6 -s ifconfig.co 2>/dev/null || echo "")
if [ -n "$IPV6_ADDRESS" ]; then
    echo "   ✅ IPv6 доступен: $IPV6_ADDRESS"
    echo "   ⚠️  Let's Encrypt может использовать IPv6 для проверки"
    echo "   💡 Убедитесь, что Nginx слушает на IPv6"
    
    # Проверяем, слушает ли Nginx на IPv6
    if sudo netstat -tlnp 2>/dev/null | grep -q ":80.*nginx" || sudo ss -tlnp 2>/dev/null | grep -q ":80.*nginx"; then
        echo "   ✅ Nginx слушает на порту 80"
    else
        echo "   ⚠️  Nginx может не слушать на порту 80"
    fi
else
    echo "   ℹ️  IPv6 недоступен или не настроен"
fi
echo ""

# 7. Получение сертификата через webroot
echo "7️⃣ Получение SSL сертификата..."
echo "   📝 Используется метод webroot (более надежный)"
echo ""

# Проверяем, есть ли уже сертификат
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "   ⚠️  Сертификат уже существует для $DOMAIN"
    read -p "   Пересоздать? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   ℹ️  Пропущено"
        exit 0
    fi
fi

echo "   🔄 Запуск Certbot с методом webroot..."
echo ""

sudo certbot certonly --webroot \
  -w /var/www/html \
  -d "$DOMAIN" \
  -d "$WWW_DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email admin@$DOMAIN \
  --keep-until-expiring

if [ $? -eq 0 ]; then
    echo ""
    echo "   ✅ Сертификат успешно получен!"
    echo ""
    
    # 8. Настройка Nginx для HTTPS
    echo "8️⃣ Настройка Nginx для HTTPS..."
    
    # Создаем резервную копию
    sudo cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Создаем полную конфигурацию с HTTPS
    sudo tee "$NGINX_CONFIG" > /dev/null <<EOF
# HTTP -> HTTPS редирект
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN $WWW_DOMAIN;
    
    # ACME challenge для обновления сертификата
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files \$uri =404;
    }
    
    # Редирект на HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS сервер
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN $WWW_DOMAIN;
    
    # SSL сертификаты
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Проксирование на Next.js приложение
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Таймауты
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
    
    client_max_body_size 50M;
}
EOF
    
    echo "   ✅ Конфигурация HTTPS создана"
    echo ""
    
    # 9. Проверка и перезагрузка
    echo "9️⃣ Проверка конфигурации..."
    if sudo nginx -t; then
        echo "   ✅ Синтаксис корректен"
        echo ""
        echo "   🔄 Перезагрузка Nginx..."
        sudo systemctl reload nginx
        echo "   ✅ Nginx перезагружен"
        echo ""
        echo "✅ SSL сертификат настроен и активен!"
        echo ""
        echo "🌐 Проверьте сайт:"
        echo "   https://$DOMAIN"
        echo "   https://$WWW_DOMAIN"
    else
        echo "   ❌ Ошибки в конфигурации!"
        exit 1
    fi
else
    echo ""
    echo "   ❌ Не удалось получить сертификат"
    echo ""
    echo "💡 Возможные причины:"
    echo "   1. DNS не настроен правильно"
    echo "   2. Домен недоступен из интернета"
    echo "   3. Проблемы с IPv6"
    echo "   4. Rate limit от Let's Encrypt"
    echo ""
    echo "📝 Попробуйте вручную:"
    echo "   sudo certbot certonly --webroot -w /var/www/html -d $DOMAIN -d $WWW_DOMAIN"
    exit 1
fi

