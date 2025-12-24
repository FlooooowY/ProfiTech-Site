#!/bin/bash

echo "🔍 Проверка сервисов для перевода товаров..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Проверка MongoDB
echo "1️⃣ Проверка MongoDB..."
if command -v mongod &> /dev/null; then
    echo "   ✅ MongoDB установлен"
    
    # Проверяем, запущен ли MongoDB
    if pgrep -x "mongod" > /dev/null; then
        echo "   ✅ MongoDB запущен"
        
        # Проверяем подключение
        if mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
            echo "   ✅ MongoDB доступен для подключения"
        else
            echo "   ⚠️  MongoDB запущен, но недоступен для подключения"
            echo "   💡 Попробуйте: sudo systemctl start mongod"
        fi
    else
        echo "   ❌ MongoDB не запущен"
        echo "   💡 Запустите: sudo systemctl start mongod"
        echo "   💡 Или: sudo service mongod start"
    fi
else
    echo "   ❌ MongoDB не установлен"
    echo "   💡 Установите MongoDB:"
    echo "      sudo apt update"
    echo "      sudo apt install -y mongodb"
    echo "      sudo systemctl start mongod"
    echo "      sudo systemctl enable mongod"
fi

echo ""

# 2. Проверка Docker
echo "2️⃣ Проверка Docker..."
if command -v docker &> /dev/null; then
    echo "   ✅ Docker установлен"
    
    # Проверяем, запущен ли Docker daemon
    if docker info > /dev/null 2>&1; then
        echo "   ✅ Docker daemon запущен"
    else
        echo "   ❌ Docker daemon не запущен"
        echo "   💡 Запустите: sudo systemctl start docker"
        echo "   💡 Или добавьте пользователя в группу docker: sudo usermod -aG docker $USER"
        echo "   💡 Затем перелогиньтесь или выполните: newgrp docker"
    fi
else
    echo "   ❌ Docker не установлен"
    echo "   💡 Установите Docker: ./scripts/install-docker.sh"
fi

echo ""

# 3. Проверка LibreTranslate
echo "3️⃣ Проверка LibreTranslate..."
if docker ps -a --format '{{.Names}}' | grep -q "^libretranslate$"; then
    echo "   ✅ Контейнер LibreTranslate существует"
    
    if docker ps --format '{{.Names}}' | grep -q "^libretranslate$"; then
        echo "   ✅ LibreTranslate запущен"
        
        # Проверяем доступность API
        if curl -s http://localhost:5000/languages > /dev/null 2>&1; then
            echo "   ✅ LibreTranslate API доступен на http://localhost:5000"
        else
            echo "   ⚠️  LibreTranslate запущен, но API недоступен"
            echo "   💡 Проверьте логи: docker logs libretranslate"
        fi
    else
        echo "   ❌ LibreTranslate не запущен"
        echo "   💡 Запустите: docker start libretranslate"
    fi
else
    echo "   ❌ Контейнер LibreTranslate не найден"
    echo "   💡 Создайте и запустите контейнер:"
    echo "      docker run -d -p 5000:5000 --name libretranslate libretranslate/libretranslate"
fi

echo ""

# 4. Проверка переменных окружения
echo "4️⃣ Проверка переменных окружения..."
if [ -f ".env.local" ]; then
    echo "   ✅ Файл .env.local найден"
    
    if grep -q "MONGODB_URI\|DB_HOST\|DB_NAME" .env.local; then
        echo "   ✅ Настройки MongoDB найдены в .env.local"
    else
        echo "   ⚠️  Настройки MongoDB не найдены в .env.local"
        echo "   💡 Добавьте в .env.local:"
        echo "      MONGODB_URI=mongodb://localhost:27017/profitech_db"
    fi
else
    echo "   ⚠️  Файл .env.local не найден"
    echo "   💡 Создайте .env.local с настройками MongoDB"
fi

echo ""

# 5. Итоговые рекомендации
echo "📋 Итоговые рекомендации:"
echo ""

# MongoDB
if ! pgrep -x "mongod" > /dev/null; then
    echo "   🔧 Запустите MongoDB:"
    echo "      sudo systemctl start mongod"
    echo ""
fi

# LibreTranslate
if ! docker ps --format '{{.Names}}' | grep -q "^libretranslate$"; then
    echo "   🔧 Запустите LibreTranslate:"
    echo "      docker run -d -p 5000:5000 --name libretranslate libretranslate/libretranslate"
    echo ""
fi

echo "   ✅ После запуска всех сервисов выполните:"
echo "      npm run db:translate-products-fast"
echo ""

