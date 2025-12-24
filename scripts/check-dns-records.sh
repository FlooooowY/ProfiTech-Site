#!/bin/bash

# Скрипт для проверки DNS записей домена
# Использование: ./check-dns-records.sh profitech.store

set -e

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="${1:-profitech.store}"
WWW_DOMAIN="www.$DOMAIN"

echo "🔍 Проверка DNS записей для $DOMAIN..."
echo ""

# 1. Получение IP сервера
echo "1️⃣ Определение IP-адреса сервера..."
SERVER_IPV4=$(curl -4 -s --max-time 5 ifconfig.me 2>/dev/null || curl -4 -s --max-time 5 ipinfo.io/ip 2>/dev/null || echo "")
SERVER_IPV6=$(curl -6 -s --max-time 5 ifconfig.co 2>/dev/null || echo "")

if [ -n "$SERVER_IPV4" ]; then
    echo "   ✅ IPv4 сервера: $SERVER_IPV4"
else
    echo "   ⚠️  Не удалось определить IPv4"
fi

if [ -n "$SERVER_IPV6" ]; then
    echo "   ✅ IPv6 сервера: $SERVER_IPV6"
else
    echo "   ℹ️  IPv6 не настроен или недоступен"
fi
echo ""

# 2. Проверка A-записи для корневого домена
echo "2️⃣ Проверка A-записи для $DOMAIN..."
DNS_IPV4=$(nslookup "$DOMAIN" 2>/dev/null | grep -A 1 "Name:" | tail -1 | awk '{print $2}' | head -1)

if [ -z "$DNS_IPV4" ]; then
    # Попробуем через dig
    DNS_IPV4=$(dig +short "$DOMAIN" A 2>/dev/null | head -1)
fi

if [ -z "$DNS_IPV4" ]; then
    echo "   ❌ A-запись не найдена!"
    echo "   💡 Добавьте A-запись в панели управления DNS:"
    echo "      Название: @"
    echo "      Тип: A"
    echo "      Данные: $SERVER_IPV4"
elif [ "$DNS_IPV4" = "$SERVER_IPV4" ]; then
    echo "   ✅ A-запись настроена правильно: $DNS_IPV4"
else
    echo "   ⚠️  A-запись указывает на другой IP: $DNS_IPV4"
    echo "   💡 Ожидался IP: $SERVER_IPV4"
    echo "   💡 Обновите A-запись в панели управления DNS"
fi
echo ""

# 3. Проверка A-записи для www
echo "3️⃣ Проверка A-записи для $WWW_DOMAIN..."
WWW_IPV4=$(nslookup "$WWW_DOMAIN" 2>/dev/null | grep -A 1 "Name:" | tail -1 | awk '{print $2}' | head -1)

if [ -z "$WWW_IPV4" ]; then
    WWW_IPV4=$(dig +short "$WWW_DOMAIN" A 2>/dev/null | head -1)
fi

if [ -z "$WWW_IPV4" ]; then
    echo "   ❌ A-запись для www не найдена!"
    echo "   💡 Добавьте A-запись в панели управления DNS:"
    echo "      Название: www"
    echo "      Тип: A"
    echo "      Данные: $SERVER_IPV4"
elif [ "$WWW_IPV4" = "$SERVER_IPV4" ]; then
    echo "   ✅ A-запись для www настроена правильно: $WWW_IPV4"
else
    echo "   ⚠️  A-запись для www указывает на другой IP: $WWW_IPV4"
    echo "   💡 Ожидался IP: $SERVER_IPV4"
fi
echo ""

# 4. Проверка AAAA-записи (IPv6)
if [ -n "$SERVER_IPV6" ]; then
    echo "4️⃣ Проверка AAAA-записи (IPv6) для $DOMAIN..."
    DNS_IPV6=$(dig +short "$DOMAIN" AAAA 2>/dev/null | head -1)
    
    if [ -z "$DNS_IPV6" ]; then
        echo "   ⚠️  AAAA-запись не найдена (опционально)"
        echo "   💡 Если хотите поддержку IPv6, добавьте:"
        echo "      Название: @"
        echo "      Тип: AAAA"
        echo "      Данные: $SERVER_IPV6"
    elif [ "$DNS_IPV6" = "$SERVER_IPV6" ]; then
        echo "   ✅ AAAA-запись настроена правильно: $DNS_IPV6"
    else
        echo "   ⚠️  AAAA-запись указывает на другой IPv6: $DNS_IPV6"
    fi
    echo ""
fi

# 5. Проверка NS записей
echo "5️⃣ Проверка NS записей (nameservers)..."
NS_RECORDS=$(dig +short "$DOMAIN" NS 2>/dev/null | sort)

if [ -z "$NS_RECORDS" ]; then
    echo "   ⚠️  NS записи не найдены"
else
    echo "   ✅ Nameservers:"
    echo "$NS_RECORDS" | while read ns; do
        echo "      - $ns"
    done
    
    # Проверяем, что используются HOSTKEY nameservers
    if echo "$NS_RECORDS" | grep -q "hostkey.ru"; then
        echo "   ✅ Используются HOSTKEY nameservers"
    else
        echo "   ⚠️  Не используются HOSTKEY nameservers"
        echo "   💡 Убедитесь, что у регистратора указаны:"
        echo "      ns1.hostkey.ru"
        echo "      ns2.hostkey.ru"
    fi
fi
echo ""

# 6. Проверка доступности домена
echo "6️⃣ Проверка доступности домена..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://$DOMAIN" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "   ✅ Домен доступен (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "   ❌ Домен недоступен"
    echo "   💡 Проверьте:"
    echo "      - DNS записи настроены правильно"
    echo "      - Nginx запущен: sudo systemctl status nginx"
    echo "      - Приложение работает: pm2 list"
else
    echo "   ⚠️  Домен возвращает HTTP $HTTP_CODE"
fi
echo ""

# Итоговая сводка
echo "📋 Итоговая сводка:"
echo ""

ALL_OK=true

if [ -z "$DNS_IPV4" ] || [ "$DNS_IPV4" != "$SERVER_IPV4" ]; then
    echo "   ❌ A-запись для $DOMAIN не настроена или неправильная"
    ALL_OK=false
else
    echo "   ✅ A-запись для $DOMAIN настроена"
fi

if [ -z "$WWW_IPV4" ] || [ "$WWW_IPV4" != "$SERVER_IPV4" ]; then
    echo "   ❌ A-запись для $WWW_DOMAIN не настроена или неправильная"
    ALL_OK=false
else
    echo "   ✅ A-запись для $WWW_DOMAIN настроена"
fi

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "301" ] && [ "$HTTP_CODE" != "302" ]; then
    echo "   ❌ Домен недоступен"
    ALL_OK=false
else
    echo "   ✅ Домен доступен"
fi

echo ""

if [ "$ALL_OK" = true ]; then
    echo "✅ Все DNS записи настроены правильно!"
    echo ""
    echo "📝 Следующие шаги:"
    echo "   1. Получите SSL сертификат: npm run ssl:get-webroot"
    echo "   2. Проверьте работу сайта: curl https://$DOMAIN"
else
    echo "⚠️  Есть проблемы с DNS записями!"
    echo ""
    echo "📝 Что нужно сделать:"
    echo "   1. Откройте панель управления DNS (HOSTKEY)"
    echo "   2. Добавьте A-запись для @ (корневой домен):"
    echo "      Название: @"
    echo "      Тип: A"
    echo "      Данные: $SERVER_IPV4"
    echo "   3. Добавьте A-запись для www:"
    echo "      Название: www"
    echo "      Тип: A"
    echo "      Данные: $SERVER_IPV4"
    echo "   4. Подождите 5-15 минут"
    echo "   5. Запустите проверку снова: npm run dns:check"
fi
echo ""

