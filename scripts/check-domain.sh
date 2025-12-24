#!/bin/bash

echo "🌐 Проверка настройки домена..."
echo ""

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

DOMAIN="profitech.store"
WWW_DOMAIN="www.profitech.store"

# 1. Проверка DNS
echo "1️⃣ Проверка DNS..."
SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)
DNS_IP=$(nslookup $DOMAIN 2>/dev/null | grep -A 1 "Name:" | tail -1 | awk '{print $2}' | head -1)

if [ -z "$DNS_IP" ]; then
    echo "   ❌ Не удалось получить IP домена $DOMAIN"
else
    echo "   📍 IP сервера: $SERVER_IP"
    echo "   📍 IP домена $DOMAIN: $DNS_IP"
    
    if [ "$SERVER_IP" = "$DNS_IP" ]; then
        echo "   ✅ DNS настроен правильно"
    else
        echo "   ⚠️  DNS указывает на другой IP ($DNS_IP вместо $SERVER_IP)"
        echo "   💡 Обновите A-запись домена на IP: $SERVER_IP"
    fi
fi

echo ""

# 2. Проверка Nginx
echo "2️⃣ Проверка Nginx..."
if systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx запущен"
    
    # Проверка конфигурации
    if [ -f "/etc/nginx/sites-available/profitech" ]; then
        echo "   ✅ Конфигурация найдена"
        
        # Проверяем server_name
        if grep -q "server_name.*$DOMAIN" /etc/nginx/sites-available/profitech; then
            echo "   ✅ Домен $DOMAIN настроен в Nginx"
        else
            echo "   ⚠️  Домен $DOMAIN не найден в конфигурации Nginx"
        fi
        
        # Проверяем proxy_pass
        if grep -q "proxy_pass.*localhost:3000" /etc/nginx/sites-available/profitech; then
            echo "   ✅ Проксирование на localhost:3000 настроено"
        else
            echo "   ❌ Проксирование не настроено"
        fi
    else
        echo "   ❌ Конфигурация Nginx не найдена"
        echo "   💡 Создайте: sudo nano /etc/nginx/sites-available/profitech"
    fi
    
    # Проверка синтаксиса
    if sudo nginx -t 2>&1 | grep -q "successful"; then
        echo "   ✅ Синтаксис Nginx корректен"
    else
        echo "   ❌ Ошибки в конфигурации Nginx:"
        sudo nginx -t 2>&1 | grep -i error
    fi
else
    echo "   ❌ Nginx не запущен"
    echo "   💡 Запустите: sudo systemctl start nginx"
fi

echo ""

# 3. Проверка доступности домена
echo "3️⃣ Проверка доступности домена..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://$DOMAIN 2>/dev/null)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "   ✅ Домен доступен (HTTP $HTTP_CODE)"
elif [ -n "$HTTP_CODE" ]; then
    echo "   ⚠️  Домен возвращает HTTP $HTTP_CODE"
else
    echo "   ❌ Домен недоступен"
fi

echo ""

# 4. Проверка локального приложения
echo "4️⃣ Проверка локального приложения..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|404"; then
    echo "   ✅ Приложение отвечает на localhost:3000"
else
    echo "   ❌ Приложение не отвечает на localhost:3000"
    echo "   💡 Проверьте: pm2 list"
fi

echo ""

# 5. Рекомендации
echo "📋 Рекомендации:"
echo ""

if [ "$SERVER_IP" != "$DNS_IP" ] && [ -n "$DNS_IP" ]; then
    echo "   🔧 Обновите DNS записи:"
    echo "      A запись для $DOMAIN → $SERVER_IP"
    echo "      A запись для $WWW_DOMAIN → $SERVER_IP"
    echo ""
fi

if ! systemctl is-active --quiet nginx; then
    echo "   🔧 Запустите Nginx:"
    echo "      sudo systemctl start nginx"
    echo "      sudo systemctl enable nginx"
    echo ""
fi

if [ ! -f "/etc/nginx/sites-available/profitech" ]; then
    echo "   🔧 Создайте конфигурацию Nginx:"
    echo "      См. docs/NGINX_CONFIG.md"
    echo ""
fi

echo "   📝 Проверьте логи:"
echo "      sudo tail -f /var/log/nginx/error.log"
echo "      pm2 logs profitech"
echo ""

