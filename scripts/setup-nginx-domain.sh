#!/bin/bash

# Скрипт для автоматической настройки Nginx для домена
# Использование: ./setup-nginx-domain.sh profitech.store

set -e

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Проверка аргументов
if [ -z "$1" ]; then
    echo "Использование: $0 <domain>"
    echo "Пример: $0 profitech.store"
    exit 1
fi

DOMAIN=$1
WWW_DOMAIN="www.$DOMAIN"
PROJECT_DIR="/home/profitech/ProfiTech-Site"
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"

echo "🔧 Настройка Nginx для домена $DOMAIN..."
echo ""

# 1. Обновление пакетов
echo "1️⃣ Обновление пакетов..."
sudo apt update -qq
echo "   ✅ Пакеты обновлены"
echo ""

# 2. Установка Nginx (если не установлен)
echo "2️⃣ Проверка Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "   📦 Установка Nginx..."
    sudo apt install nginx -y
    echo "   ✅ Nginx установлен"
else
    echo "   ✅ Nginx уже установлен"
fi
echo ""

# 3. Создание конфигурационного файла
echo "3️⃣ Создание конфигурации Nginx..."
sudo tee "$NGINX_CONFIG" > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN $WWW_DOMAIN;
    
    # ВАЖНО: Блок для Let's Encrypt ACME challenge (должен быть ПЕРЕД location /)
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files \$uri =404;
    }
    
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

echo "   ✅ Конфигурация создана: $NGINX_CONFIG"
echo ""

# 4. Создание символической ссылки
echo "4️⃣ Активация конфигурации..."
if [ -L "/etc/nginx/sites-enabled/$DOMAIN" ]; then
    echo "   ⚠️  Символическая ссылка уже существует, удаляем старую..."
    sudo rm "/etc/nginx/sites-enabled/$DOMAIN"
fi

sudo ln -s "$NGINX_CONFIG" "/etc/nginx/sites-enabled/$DOMAIN"
echo "   ✅ Символическая ссылка создана"
echo ""

# 5. Удаление дефолтной конфигурации (если есть)
echo "5️⃣ Проверка дефолтной конфигурации..."
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    echo "   ⚠️  Найдена дефолтная конфигурация, удаляем..."
    sudo rm "/etc/nginx/sites-enabled/default"
    echo "   ✅ Дефолтная конфигурация удалена"
else
    echo "   ✅ Дефолтная конфигурация не найдена"
fi
echo ""

# 6. Создание директории для ACME challenge
echo "6️⃣ Создание директории для ACME challenge..."
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
echo "   ✅ Директория создана"
echo ""

# 7. Проверка синтаксиса
echo "7️⃣ Проверка синтаксиса Nginx..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Синтаксис корректен"
else
    echo "   ❌ Ошибки в конфигурации:"
    sudo nginx -t
    exit 1
fi
echo ""

# 8. Перезапуск Nginx
echo "8️⃣ Перезапуск Nginx..."
sudo systemctl restart nginx
echo "   ✅ Nginx перезапущен"
echo ""

# 9. Проверка статуса
echo "9️⃣ Проверка статуса Nginx..."
if systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx работает"
else
    echo "   ❌ Nginx не запущен"
    sudo systemctl status nginx
    exit 1
fi
echo ""

# 10. Проверка доступности
echo "🔟 Проверка доступности..."
sleep 2

LOCAL_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
DOMAIN_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN 2>/dev/null || echo "000")

if [ "$LOCAL_CHECK" = "200" ] || [ "$LOCAL_CHECK" = "404" ]; then
    echo "   ✅ localhost:3000 доступен (HTTP $LOCAL_CHECK)"
else
    echo "   ⚠️  localhost:3000 недоступен (HTTP $LOCAL_CHECK)"
    echo "   💡 Убедитесь, что приложение запущено: pm2 list"
fi

if [ "$DOMAIN_CHECK" = "200" ] || [ "$DOMAIN_CHECK" = "404" ]; then
    echo "   ✅ Домен $DOMAIN доступен (HTTP $DOMAIN_CHECK)"
elif [ "$DOMAIN_CHECK" = "000" ]; then
    echo "   ⚠️  Домен $DOMAIN недоступен"
    echo "   💡 Проверьте DNS: nslookup $DOMAIN"
else
    echo "   ⚠️  Домен $DOMAIN возвращает HTTP $DOMAIN_CHECK"
fi
echo ""

# Итоговая информация
echo "✅ Настройка завершена!"
echo ""
echo "📋 Следующие шаги:"
echo ""
echo "1. Проверьте DNS записи:"
echo "   nslookup $DOMAIN"
echo "   Должен вернуть IP вашего сервера"
echo ""
echo "2. Проверьте работу сайта:"
echo "   curl http://$DOMAIN"
echo ""
echo "3. После проверки DNS настройте SSL:"
echo "   sudo certbot --nginx -d $DOMAIN -d $WWW_DOMAIN"
echo ""
echo "📝 Конфигурация сохранена в: $NGINX_CONFIG"
echo ""

