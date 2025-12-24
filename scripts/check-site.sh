#!/bin/bash

echo "🔍 Проверка доступности сайта..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Проверка PM2
echo "1️⃣ Проверка PM2..."
if pm2 list | grep -q "profitech.*online"; then
    echo "   ✅ Приложение запущено в PM2"
    pm2 list | grep profitech
else
    echo "   ❌ Приложение не запущено в PM2"
    echo "   💡 Запустите: pm2 start npm --name profitech -- start"
fi

echo ""

# 2. Проверка порта 3000
echo "2️⃣ Проверка порта 3000..."
if netstat -tuln 2>/dev/null | grep -q ":3000" || ss -tuln 2>/dev/null | grep -q ":3000"; then
    echo "   ✅ Порт 3000 прослушивается"
else
    echo "   ❌ Порт 3000 не прослушивается"
    echo "   💡 Приложение может быть не запущено"
fi

echo ""

# 3. Проверка локального доступа
echo "3️⃣ Проверка локального доступа (localhost:3000)..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302"; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
    echo "   ✅ Локальный доступ работает (HTTP $HTTP_CODE)"
else
    echo "   ❌ Локальный доступ не работает"
    echo "   💡 Проверьте логи: pm2 logs profitech"
fi

echo ""

# 4. Проверка Nginx
echo "4️⃣ Проверка Nginx..."
if systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx запущен"
    
    # Проверка конфигурации
    if sudo nginx -t 2>&1 | grep -q "successful"; then
        echo "   ✅ Конфигурация Nginx корректна"
    else
        echo "   ⚠️  Проблемы с конфигурацией Nginx"
        sudo nginx -t
    fi
else
    echo "   ❌ Nginx не запущен"
    echo "   💡 Запустите: sudo systemctl start nginx"
fi

echo ""

# 5. Проверка домена
echo "5️⃣ Проверка домена (profitech.store)..."
DOMAIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://profitech.store 2>/dev/null)
if [ "$DOMAIN_RESPONSE" = "200" ] || [ "$DOMAIN_RESPONSE" = "301" ] || [ "$DOMAIN_RESPONSE" = "302" ]; then
    echo "   ✅ Домен доступен (HTTP $DOMAIN_RESPONSE)"
elif [ -n "$DOMAIN_RESPONSE" ]; then
    echo "   ⚠️  Домен возвращает HTTP $DOMAIN_RESPONSE"
else
    echo "   ❌ Домен недоступен"
    echo "   💡 Проверьте DNS и Nginx конфигурацию"
fi

echo ""

# 6. Проверка проксирования
echo "6️⃣ Проверка проксирования Nginx -> localhost:3000..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ localhost:3000 доступен"
    
    # Проверяем, что Nginx проксирует запросы
    if [ -f /etc/nginx/sites-available/profitech ]; then
        if grep -q "proxy_pass.*localhost:3000" /etc/nginx/sites-available/profitech; then
            echo "   ✅ Nginx настроен на проксирование на localhost:3000"
        else
            echo "   ⚠️  Nginx конфигурация не содержит proxy_pass на localhost:3000"
        fi
    fi
else
    echo "   ❌ localhost:3000 недоступен"
fi

echo ""

# 7. Итоговые рекомендации
echo "📋 Рекомендации:"
echo ""

if ! pm2 list | grep -q "profitech.*online"; then
    echo "   🔧 Перезапустите приложение:"
    echo "      cd ~/ProfiTech-Site"
    echo "      pm2 restart profitech"
    echo ""
fi

if ! systemctl is-active --quiet nginx; then
    echo "   🔧 Запустите Nginx:"
    echo "      sudo systemctl start nginx"
    echo ""
fi

echo "   📝 Проверьте логи приложения:"
echo "      pm2 logs profitech --lines 50"
echo ""
echo "   📝 Проверьте логи Nginx:"
echo "      sudo tail -f /var/log/nginx/error.log"
echo ""

