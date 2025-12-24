#!/bin/bash

# Исправление /etc/hosts для правильной работы MongoDB и приложения
# Использование: sudo ./fix-etc-hosts.sh

set -e

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔧 Исправление /etc/hosts..."
echo ""

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Этот скрипт нужно запускать с sudo"
    echo "💡 Запустите: sudo ./scripts/fix-etc-hosts.sh"
    exit 1
fi

# Создаем резервную копию
echo "1️⃣ Создание резервной копии /etc/hosts..."
cp /etc/hosts /etc/hosts.backup.$(date +%Y%m%d_%H%M%S)
echo "   ✅ Резервная копия создана"
echo ""

# Проверяем текущее содержимое
echo "2️⃣ Текущее содержимое /etc/hosts:"
cat /etc/hosts | sed 's/^/   /'
echo ""

# Создаем правильный /etc/hosts
echo "3️⃣ Создание правильного /etc/hosts..."

# Получаем IP сервера из существующего файла или определяем автоматически
SERVER_IP=$(grep "profitech.store" /etc/hosts | awk '{print $1}' | head -1)
if [ -z "$SERVER_IP" ]; then
    SERVER_IP=$(curl -4 -s --max-time 5 ifconfig.me 2>/dev/null || curl -4 -s --max-time 5 ipinfo.io/ip 2>/dev/null || echo "82.26.91.241")
fi

# Создаем правильный файл
cat > /etc/hosts <<EOF
# /etc/hosts: static lookup table for host names
#
# IP сервера для домена
${SERVER_IP} profitech.store
${SERVER_IP} www.profitech.store

# localhost должен быть 127.0.0.1 (не 127.0.1.1!)
127.0.0.1 localhost
127.0.0.1 localhost.localdomain

# The following lines are desirable for IPv6 capable hosts
::1     ip6-localhost ip6-loopback
fe00::0 ip6-localnet
ff00::0 ip6-mcastprefix
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
EOF

echo "   ✅ /etc/hosts обновлен"
echo ""

# Показываем новое содержимое
echo "4️⃣ Новое содержимое /etc/hosts:"
cat /etc/hosts | sed 's/^/   /'
echo ""

# Проверка резолвинга
echo "5️⃣ Проверка резолвинга..."
if ping -c 1 localhost > /dev/null 2>&1; then
    echo "   ✅ localhost резолвится правильно"
else
    echo "   ⚠️  Проблемы с резолвингом localhost"
fi

if ping -c 1 127.0.0.1 > /dev/null 2>&1; then
    echo "   ✅ 127.0.0.1 доступен"
else
    echo "   ❌ 127.0.0.1 недоступен"
fi

if ping -c 1 profitech.store > /dev/null 2>&1; then
    echo "   ✅ profitech.store резолвится правильно"
else
    echo "   ⚠️  profitech.store не резолвится (это нормально, если DNS еще не настроен)"
fi
echo ""

# Проверка MongoDB
echo "6️⃣ Проверка подключения к MongoDB..."
if mongosh --host 127.0.0.1:27017 --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
    echo "   ✅ MongoDB доступен через 127.0.0.1"
elif mongosh --host localhost:27017 --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
    echo "   ✅ MongoDB доступен через localhost"
else
    echo "   ⚠️  MongoDB недоступен (возможно, не запущен)"
    echo "   💡 Запустите: sudo systemctl start mongod"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ /etc/hosts исправлен!"
echo ""
echo "📋 Изменения:"
echo "   • Добавлен 127.0.0.1 localhost (вместо 127.0.1.1)"
echo "   • Сохранен IP сервера для profitech.store: ${SERVER_IP}"
echo ""
echo "💡 Следующие шаги:"
echo "   1. Обновите .env.local: npm run db:fix-connection"
echo "   2. Перезапустите приложение: pm2 restart all --update-env"
echo ""

