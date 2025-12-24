#!/bin/bash

# Исправление проблемы с подключением к MongoDB после изменения /etc/hosts
# Использование: ./fix-mongodb-connection.sh

set -e

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔧 Исправление подключения к MongoDB..."
echo ""

# 1. Проверка статуса MongoDB
echo "1️⃣ Проверка статуса MongoDB..."
if pgrep -x "mongod" > /dev/null; then
    echo "   ✅ MongoDB запущен"
else
    echo "   ❌ MongoDB не запущен"
    echo "   🔄 Запускаем MongoDB..."
    if sudo systemctl start mongod 2>/dev/null || sudo service mongod start 2>/dev/null; then
        sleep 2
        echo "   ✅ MongoDB запущен"
    else
        echo "   ❌ Не удалось запустить MongoDB"
        echo "   💡 Попробуйте: sudo systemctl start mongod"
        exit 1
    fi
fi
echo ""

# 2. Проверка на каком адресе слушает MongoDB
echo "2️⃣ Проверка адресов MongoDB..."
MONGO_LISTEN=$(sudo netstat -tlnp 2>/dev/null | grep mongod | grep 27017 || sudo ss -tlnp 2>/dev/null | grep mongod | grep 27017 || echo "")

if [ -n "$MONGO_LISTEN" ]; then
    echo "   ✅ MongoDB слушает на порту 27017"
    echo "   📍 Адреса:"
    echo "$MONGO_LISTEN" | while read line; do
        echo "      $line"
    done
else
    echo "   ⚠️  Не удалось определить адреса MongoDB"
fi
echo ""

# 3. Проверка /etc/hosts
echo "3️⃣ Проверка /etc/hosts..."
if grep -q "127.0.1.1" /etc/hosts; then
    echo "   ⚠️  Найден адрес 127.0.1.1 в /etc/hosts"
    echo "   📝 Записи с 127.0.1.1:"
    grep "127.0.1.1" /etc/hosts | sed 's/^/      /'
    echo ""
    echo "   💡 Это может вызывать проблемы с подключением к MongoDB"
    echo "   💡 MongoDB обычно слушает на 127.0.0.1 или 0.0.0.0"
fi

if grep -q "localhost" /etc/hosts; then
    echo "   ✅ Записи localhost найдены"
    echo "   📝 Записи localhost:"
    grep "localhost" /etc/hosts | sed 's/^/      /'
else
    echo "   ⚠️  Записи localhost не найдены в /etc/hosts"
fi
echo ""

# 4. Тест подключения к MongoDB
echo "4️⃣ Тест подключения к MongoDB..."
echo "   Тест 1: localhost:27017"
if mongosh --host localhost:27017 --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
    echo "      ✅ Подключение через localhost работает"
    MONGO_HOST="localhost"
elif mongosh --host 127.0.0.1:27017 --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
    echo "      ✅ Подключение через 127.0.0.1 работает"
    MONGO_HOST="127.0.0.1"
elif mongosh --host 127.0.1.1:27017 --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
    echo "      ✅ Подключение через 127.0.1.1 работает"
    MONGO_HOST="127.0.1.1"
else
    echo "      ❌ Не удалось подключиться ни к одному адресу"
    echo "      💡 Проверьте, что MongoDB запущен: sudo systemctl status mongod"
    exit 1
fi
echo ""

# 5. Проверка .env.local
echo "5️⃣ Проверка переменных окружения..."
ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo "   ⚠️  Файл .env.local не найден, создаем..."
    touch "$ENV_FILE"
    chmod 600 "$ENV_FILE"
fi

# Обновляем MONGODB_URI с правильным хостом
if grep -q "MONGODB_URI=" "$ENV_FILE"; then
    echo "   📝 Обновляем MONGODB_URI..."
    # Получаем текущие значения
    DB_USER=$(grep "DB_USER=" "$ENV_FILE" | cut -d'=' -f2 || echo "admin_db")
    DB_PASSWORD=$(grep "DB_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2 || echo "admin_db")
    DB_NAME=$(grep "DB_NAME=" "$ENV_FILE" | cut -d'=' -f2 || echo "profitech_db")
    
    # Обновляем MONGODB_URI с правильным хостом
    sed -i "s|MONGODB_URI=.*|MONGODB_URI=mongodb://${DB_USER}:${DB_PASSWORD}@${MONGO_HOST}:27017/${DB_NAME}?authSource=admin|" "$ENV_FILE"
    
    # Если строка не была найдена, добавляем
    if ! grep -q "MONGODB_URI=" "$ENV_FILE"; then
        echo "MONGODB_URI=mongodb://${DB_USER}:${DB_PASSWORD}@${MONGO_HOST}:27017/${DB_NAME}?authSource=admin" >> "$ENV_FILE"
    fi
    
    echo "   ✅ MONGODB_URI обновлен: mongodb://...@${MONGO_HOST}:27017/..."
else
    echo "   📝 Добавляем MONGODB_URI..."
    DB_USER=$(grep "DB_USER=" "$ENV_FILE" | cut -d'=' -f2 || echo "admin_db")
    DB_PASSWORD=$(grep "DB_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2 || echo "admin_db")
    DB_NAME=$(grep "DB_NAME=" "$ENV_FILE" | cut -d'=' -f2 || echo "profitech_db")
    
    echo "MONGODB_URI=mongodb://${DB_USER}:${DB_PASSWORD}@${MONGO_HOST}:27017/${DB_NAME}?authSource=admin" >> "$ENV_FILE"
    echo "   ✅ MONGODB_URI добавлен"
fi

# Также обновляем DB_HOST
if grep -q "DB_HOST=" "$ENV_FILE"; then
    sed -i "s|DB_HOST=.*|DB_HOST=${MONGO_HOST}|" "$ENV_FILE"
else
    echo "DB_HOST=${MONGO_HOST}" >> "$ENV_FILE"
fi

echo "   ✅ Переменные окружения обновлены"
echo ""

# 6. Показываем обновленный .env.local (без паролей)
echo "6️⃣ Текущие настройки MongoDB в .env.local:"
grep -E "MONGODB_URI|DB_HOST|DB_NAME|DB_USER" "$ENV_FILE" | sed 's/\(password\)[^@]*/\1:***/g' | sed 's/^/   /'
echo ""

# 7. Перезапуск приложения
echo "7️⃣ Перезапуск приложения..."
if command -v pm2 &> /dev/null; then
    echo "   🔄 Перезапускаем PM2 с обновленными переменными окружения..."
    pm2 restart all --update-env
    sleep 2
    
    if pm2 list | grep -q "online"; then
        echo "   ✅ Приложение перезапущено"
    else
        echo "   ⚠️  Проверьте статус: pm2 list"
    fi
else
    echo "   ⚠️  PM2 не найден, перезапустите приложение вручную"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Исправление завершено!"
echo ""
echo "📋 Что было сделано:"
echo "   1. Проверен статус MongoDB"
echo "   2. Определен рабочий адрес MongoDB: ${MONGO_HOST}"
echo "   3. Обновлен .env.local с правильным адресом"
echo "   4. Перезапущено приложение"
echo ""
echo "💡 Если проблема сохраняется:"
echo "   1. Проверьте логи: pm2 logs profitech --lines 50"
echo "   2. Убедитесь, что MongoDB запущен: sudo systemctl status mongod"
echo "   3. Проверьте подключение: mongosh --host ${MONGO_HOST}:27017"
echo ""

