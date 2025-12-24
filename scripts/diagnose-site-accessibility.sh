#!/bin/bash

# Диагностика доступности сайта из интернета
# Использование: ./diagnose-site-accessibility.sh

set -e

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="profitech.store"
WWW_DOMAIN="www.profitech.store"
SERVER_IP="82.26.91.241"

echo "🔍 Диагностика доступности сайта из интернета..."
echo ""

# 1. Проверка DNS через разные серверы
echo "1️⃣ Проверка DNS через публичные серверы..."
echo ""

# Google DNS
echo "   📍 Google DNS (8.8.8.8):"
GOOGLE_IP=$(dig @8.8.8.8 +short "$DOMAIN" A 2>/dev/null | head -1)
if [ -n "$GOOGLE_IP" ]; then
    if [ "$GOOGLE_IP" = "$SERVER_IP" ]; then
        echo "      ✅ Видит правильный IP: $GOOGLE_IP"
    else
        echo "      ⚠️  Видит другой IP: $GOOGLE_IP (ожидался: $SERVER_IP)"
    fi
else
    echo "      ❌ Не видит A-запись (SERVFAIL)"
fi

# Cloudflare DNS
echo "   📍 Cloudflare DNS (1.1.1.1):"
CF_IP=$(dig @1.1.1.1 +short "$DOMAIN" A 2>/dev/null | head -1)
if [ -n "$CF_IP" ]; then
    if [ "$CF_IP" = "$SERVER_IP" ]; then
        echo "      ✅ Видит правильный IP: $CF_IP"
    else
        echo "      ⚠️  Видит другой IP: $CF_IP (ожидался: $SERVER_IP)"
    fi
else
    echo "      ❌ Не видит A-запись (SERVFAIL)"
fi

# Quad9 DNS
echo "   📍 Quad9 DNS (9.9.9.9):"
Q9_IP=$(dig @9.9.9.9 +short "$DOMAIN" A 2>/dev/null | head -1)
if [ -n "$Q9_IP" ]; then
    if [ "$Q9_IP" = "$SERVER_IP" ]; then
        echo "      ✅ Видит правильный IP: $Q9_IP"
    else
        echo "      ⚠️  Видит другой IP: $Q9_IP (ожидался: $SERVER_IP)"
    fi
else
    echo "      ❌ Не видит A-запись (SERVFAIL)"
fi
echo ""

# 2. Проверка доступности HTTP
echo "2️⃣ Проверка доступности HTTP (порт 80)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://$DOMAIN" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "   ✅ HTTP доступен (код: $HTTP_CODE)"
else
    echo "   ⚠️  HTTP недоступен (код: $HTTP_CODE)"
fi
echo ""

# 3. Проверка доступности HTTPS
echo "3️⃣ Проверка доступности HTTPS (порт 443)..."
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -k "https://$DOMAIN" 2>/dev/null || echo "000")
if [ "$HTTPS_CODE" = "200" ] || [ "$HTTPS_CODE" = "301" ] || [ "$HTTPS_CODE" = "302" ]; then
    echo "   ✅ HTTPS доступен (код: $HTTPS_CODE)"
else
    echo "   ⚠️  HTTPS недоступен (код: $HTTPS_CODE)"
fi

# Проверка SSL сертификата
SSL_INFO=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null || echo "")
if [ -n "$SSL_INFO" ]; then
    echo "   ✅ SSL сертификат валиден"
    echo "$SSL_INFO" | sed 's/^/      /'
else
    echo "   ⚠️  Не удалось проверить SSL сертификат"
fi
echo ""

# 4. Проверка портов на сервере
echo "4️⃣ Проверка открытых портов на сервере..."
if command -v netstat &> /dev/null; then
    PORT_80=$(sudo netstat -tlnp 2>/dev/null | grep ":80 " || echo "")
    PORT_443=$(sudo netstat -tlnp 2>/dev/null | grep ":443 " || echo "")
    
    if [ -n "$PORT_80" ]; then
        echo "   ✅ Порт 80 открыт и слушается"
    else
        echo "   ❌ Порт 80 не слушается"
    fi
    
    if [ -n "$PORT_443" ]; then
        echo "   ✅ Порт 443 открыт и слушается"
    else
        echo "   ❌ Порт 443 не слушается"
    fi
elif command -v ss &> /dev/null; then
    PORT_80=$(sudo ss -tlnp 2>/dev/null | grep ":80 " || echo "")
    PORT_443=$(sudo ss -tlnp 2>/dev/null | grep ":443 " || echo "")
    
    if [ -n "$PORT_80" ]; then
        echo "   ✅ Порт 80 открыт и слушается"
    else
        echo "   ❌ Порт 80 не слушается"
    fi
    
    if [ -n "$PORT_443" ]; then
        echo "   ✅ Порт 443 открыт и слушается"
    else
        echo "   ❌ Порт 443 не слушается"
    fi
fi
echo ""

# 5. Проверка файрвола
echo "5️⃣ Проверка файрвола..."
UFW_STATUS=$(sudo ufw status 2>/dev/null | head -1 || echo "inactive")
if echo "$UFW_STATUS" | grep -q "active"; then
    echo "   ⚠️  UFW активен"
    echo "   💡 Проверьте правила: sudo ufw status numbered"
    echo "   💡 Убедитесь, что порты 80 и 443 открыты:"
    echo "      sudo ufw allow 80/tcp"
    echo "      sudo ufw allow 443/tcp"
else
    echo "   ℹ️  UFW неактивен (это нормально, если используется другой файрвол)"
fi
echo ""

# 6. Проверка Nginx
echo "6️⃣ Проверка Nginx..."
if systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx запущен"
    
    # Проверяем конфигурацию
    if sudo nginx -t 2>&1 | grep -q "successful"; then
        echo "   ✅ Конфигурация Nginx корректна"
    else
        echo "   ❌ Ошибки в конфигурации Nginx:"
        sudo nginx -t 2>&1 | grep -i error
    fi
else
    echo "   ❌ Nginx не запущен"
    echo "   💡 Запустите: sudo systemctl start nginx"
fi
echo ""

# 7. Проверка через онлайн сервисы
echo "7️⃣ Рекомендации по проверке из интернета..."
echo "   💡 Используйте онлайн сервисы для проверки доступности:"
echo ""
echo "   1. Проверка DNS:"
echo "      https://dnschecker.org/#A/$DOMAIN"
echo ""
echo "   2. Проверка доступности сайта:"
echo "      https://www.isitdownrightnow.com/$DOMAIN.html"
echo ""
echo "   3. Проверка SSL:"
echo "      https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
echo "   4. Проверка портов:"
echo "      https://www.yougetsignal.com/tools/open-ports/"
echo "      IP: $SERVER_IP, Порты: 80, 443"
echo ""

# 8. Итоговые рекомендации
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Возможные причины, почему другие не могут открыть сайт:"
echo ""

# Проверяем DNS
if [ -z "$GOOGLE_IP" ] || [ "$GOOGLE_IP" != "$SERVER_IP" ]; then
    echo "   1. ❌ DNS записи еще не распространились на все серверы"
    echo "      💡 Подождите 1-2 часа и попросите других очистить DNS кэш:"
    echo "         Windows: ipconfig /flushdns"
    echo "         Mac: sudo dscacheutil -flushcache"
    echo "         Linux: sudo systemd-resolve --flush-caches"
    echo ""
fi

# Проверяем порты
if [ -z "$PORT_80" ] || [ -z "$PORT_443" ]; then
    echo "   2. ❌ Порты 80 или 443 не открыты"
    echo "      💡 Проверьте файрвол и убедитесь, что порты открыты"
    echo ""
fi

# Проверяем доступность
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "301" ] && [ "$HTTP_CODE" != "302" ]; then
    echo "   3. ❌ Сайт недоступен из интернета"
    echo "      💡 Проверьте:"
    echo "         - Nginx запущен: sudo systemctl status nginx"
    echo "         - Порты открыты: sudo ufw status"
    echo "         - Приложение работает: pm2 list"
    echo ""
fi

echo "   4. 💡 Попросите других проверить:"
echo "      - Очистить DNS кэш"
echo "      - Попробовать открыть через другой браузер"
echo "      - Попробовать открыть через мобильный интернет (не Wi-Fi)"
echo "      - Проверить, не блокирует ли антивирус/файрвол"
echo ""

echo "   5. 💡 Проверьте доступность через онлайн сервисы:"
echo "      https://dnschecker.org/#A/$DOMAIN"
echo "      https://www.isitdownrightnow.com/$DOMAIN.html"
echo ""

