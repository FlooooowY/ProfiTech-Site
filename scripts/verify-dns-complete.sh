#!/bin/bash

# Полная проверка DNS настроек перед получением SSL
# Использование: ./verify-dns-complete.sh

set -e

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="profitech.store"
WWW_DOMAIN="www.profitech.store"

echo "🔍 Полная проверка DNS настроек для получения SSL..."
echo ""

ALL_OK=true

# 1. Проверка A-записи для корневого домена
echo "1️⃣ Проверка A-записи для $DOMAIN..."
DNS_IP=$(dig +short "$DOMAIN" A 2>/dev/null | head -1)

if [ -z "$DNS_IP" ]; then
    echo "   ❌ A-запись не найдена!"
    ALL_OK=false
elif [ "$DNS_IP" = "82.26.91.241" ]; then
    echo "   ✅ A-запись настроена правильно: $DNS_IP"
else
    echo "   ⚠️  A-запись указывает на другой IP: $DNS_IP (ожидался: 82.26.91.241)"
    ALL_OK=false
fi
echo ""

# 2. Проверка A-записи для www
echo "2️⃣ Проверка A-записи для $WWW_DOMAIN..."
WWW_IP=$(dig +short "$WWW_DOMAIN" A 2>/dev/null | head -1)

if [ -z "$WWW_IP" ]; then
    echo "   ❌ A-запись для www не найдена!"
    ALL_OK=false
elif [ "$WWW_IP" = "82.26.91.241" ]; then
    echo "   ✅ A-запись для www настроена правильно: $WWW_IP"
else
    echo "   ⚠️  A-запись для www указывает на другой IP: $WWW_IP (ожидался: 82.26.91.241)"
    ALL_OK=false
fi
echo ""

# 3. Проверка через разные DNS серверы (имитация Let's Encrypt)
echo "3️⃣ Проверка через публичные DNS серверы (как Let's Encrypt)..."
echo ""

# Google DNS
echo "   📍 Google DNS (8.8.8.8):"
GOOGLE_IP=$(dig @8.8.8.8 +short "$DOMAIN" A 2>/dev/null | head -1)
if [ -n "$GOOGLE_IP" ] && [ "$GOOGLE_IP" = "82.26.91.241" ]; then
    echo "      ✅ Видит правильный IP: $GOOGLE_IP"
elif [ -z "$GOOGLE_IP" ]; then
    echo "      ❌ Не видит A-запись (SERVFAIL)"
    ALL_OK=false
else
    echo "      ⚠️  Видит другой IP: $GOOGLE_IP"
    ALL_OK=false
fi

# Cloudflare DNS
echo "   📍 Cloudflare DNS (1.1.1.1):"
CF_IP=$(dig @1.1.1.1 +short "$DOMAIN" A 2>/dev/null | head -1)
if [ -n "$CF_IP" ] && [ "$CF_IP" = "82.26.91.241" ]; then
    echo "      ✅ Видит правильный IP: $CF_IP"
elif [ -z "$CF_IP" ]; then
    echo "      ❌ Не видит A-запись (SERVFAIL)"
    ALL_OK=false
else
    echo "      ⚠️  Видит другой IP: $CF_IP"
    ALL_OK=false
fi

# Quad9 DNS
echo "   📍 Quad9 DNS (9.9.9.9):"
Q9_IP=$(dig @9.9.9.9 +short "$DOMAIN" A 2>/dev/null | head -1)
if [ -n "$Q9_IP" ] && [ "$Q9_IP" = "82.26.91.241" ]; then
    echo "      ✅ Видит правильный IP: $Q9_IP"
elif [ -z "$Q9_IP" ]; then
    echo "      ❌ Не видит A-запись (SERVFAIL)"
    ALL_OK=false
else
    echo "      ⚠️  Видит другой IP: $Q9_IP"
    ALL_OK=false
fi
echo ""

# 4. Проверка NS записей
echo "4️⃣ Проверка NS записей (nameservers)..."
NS_RECORDS=$(dig +short "$DOMAIN" NS 2>/dev/null | sort)

if [ -z "$NS_RECORDS" ]; then
    echo "   ❌ NS записи не найдены!"
    ALL_OK=false
else
    echo "   ✅ Nameservers:"
    echo "$NS_RECORDS" | while read ns; do
        echo "      - $ns"
    done
    
    # Проверяем, что используются HOSTKEY nameservers
    if echo "$NS_RECORDS" | grep -q "hostkey.ru"; then
        echo "   ✅ Используются HOSTKEY nameservers"
    else
        echo "   ⚠️  НЕ используются HOSTKEY nameservers!"
        echo "   💡 Убедитесь, что у регистратора домена указаны:"
        echo "      ns1.hostkey.ru"
        echo "      ns2.hostkey.ru"
        ALL_OK=false
    fi
fi
echo ""

# 5. Проверка доступности домена
echo "5️⃣ Проверка доступности домена через HTTP..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://$DOMAIN" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "   ✅ Домен доступен (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "   ❌ Домен недоступен"
    ALL_OK=false
else
    echo "   ⚠️  Домен возвращает HTTP $HTTP_CODE"
fi
echo ""

# 6. Проверка доступности ACME endpoint
echo "6️⃣ Проверка доступности ACME challenge endpoint..."
TEST_TOKEN="test-$(date +%s)"
echo "$TEST_TOKEN" | sudo tee /var/www/html/.well-known/acme-challenge/$TEST_TOKEN > /dev/null 2>&1
sudo chown www-data:www-data /var/www/html/.well-known/acme-challenge/$TEST_TOKEN 2>/dev/null || true

ACME_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/.well-known/acme-challenge/$TEST_TOKEN" 2>/dev/null || echo "000")

if [ "$ACME_CODE" = "200" ]; then
    echo "   ✅ ACME endpoint доступен (HTTP 200)"
else
    echo "   ⚠️  ACME endpoint возвращает HTTP $ACME_CODE"
    if [ "$ACME_CODE" != "200" ]; then
        ALL_OK=false
    fi
fi

sudo rm -f /var/www/html/.well-known/acme-challenge/$TEST_TOKEN 2>/dev/null || true
echo ""

# Итоговая сводка
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$ALL_OK" = true ]; then
    echo "✅ Все проверки пройдены! DNS записи настроены правильно."
    echo ""
    echo "📝 Теперь можно получить SSL сертификат:"
    echo "   npm run ssl:get-webroot"
    echo ""
    echo "💡 Если Let's Encrypt все еще выдает SERVFAIL:"
    echo "   1. Подождите еще 30-60 минут для полного распространения DNS"
    echo "   2. Проверьте, что у регистратора домена указаны nameservers HOSTKEY"
    echo "   3. Попробуйте получить сертификат снова"
else
    echo "⚠️  Есть проблемы с DNS настройками!"
    echo ""
    echo "📝 Что нужно исправить:"
    echo ""
    
    if [ -z "$DNS_IP" ] || [ "$DNS_IP" != "82.26.91.241" ]; then
        echo "   ❌ A-запись для $DOMAIN не настроена или неправильная"
        echo "      Добавьте в HOSTKEY: @ → A → 82.26.91.241"
        echo ""
    fi
    
    if [ -z "$WWW_IP" ] || [ "$WWW_IP" != "82.26.91.241" ]; then
        echo "   ❌ A-запись для $WWW_DOMAIN не настроена или неправильная"
        echo "      Добавьте в HOSTKEY: www → A → 82.26.91.241"
        echo ""
    fi
    
    if [ -z "$NS_RECORDS" ] || ! echo "$NS_RECORDS" | grep -q "hostkey.ru"; then
        echo "   ❌ Nameservers не настроены правильно"
        echo "      У регистратора домена должны быть указаны:"
        echo "      ns1.hostkey.ru"
        echo "      ns2.hostkey.ru"
        echo ""
    fi
    
    if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "301" ] && [ "$HTTP_CODE" != "302" ]; then
        echo "   ❌ Домен недоступен"
        echo "      Проверьте: sudo systemctl status nginx"
        echo "      Проверьте: pm2 list"
        echo ""
    fi
    
    echo "   После исправления подождите 15-30 минут и запустите проверку снова:"
    echo "   npm run dns:verify"
fi

echo ""

