#!/bin/bash

# Настройка Nginx для использования существующего SSL сертификата
# Использование: ./configure-nginx-ssl.sh

set -e

DOMAIN="profitech.store"
WWW_DOMAIN="www.profitech.store"
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"

echo "🔒 Настройка Nginx для HTTPS..."
echo ""

# Проверка существования сертификата
if [ ! -d "$CERT_PATH" ]; then
    echo "❌ Сертификат не найден: $CERT_PATH"
    echo "💡 Сначала получите сертификат: npm run ssl:get-webroot"
    exit 1
fi

echo "✅ Сертификат найден: $CERT_PATH"
echo ""

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
    ssl_certificate $CERT_PATH/fullchain.pem;
    ssl_certificate_key $CERT_PATH/privkey.pem;
    
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

echo "✅ Конфигурация создана"
echo ""

# Проверка синтаксиса
echo "🔍 Проверка синтаксиса..."
if sudo nginx -t; then
    echo "✅ Синтаксис корректен"
    echo ""
    echo "🔄 Перезагрузка Nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx перезагружен"
    echo ""
    echo "✅ HTTPS настроен!"
    echo ""
    echo "🌐 Проверьте сайт:"
    echo "   https://$DOMAIN"
    echo "   https://$WWW_DOMAIN"
else
    echo "❌ Ошибки в конфигурации!"
    exit 1
fi

