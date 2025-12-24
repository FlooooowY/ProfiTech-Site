#!/bin/bash

echo "🚀 Запуск сервисов для перевода товаров..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Запуск MongoDB
echo "1️⃣ Запуск MongoDB..."
if command -v mongod &> /dev/null; then
    if pgrep -x "mongod" > /dev/null; then
        echo "   ✅ MongoDB уже запущен"
    else
        echo "   🔄 Запускаем MongoDB..."
        if sudo systemctl start mongod 2>/dev/null || sudo service mongod start 2>/dev/null; then
            sleep 2
            if pgrep -x "mongod" > /dev/null; then
                echo "   ✅ MongoDB успешно запущен"
            else
                echo "   ❌ Не удалось запустить MongoDB"
                echo "   💡 Попробуйте вручную: sudo systemctl start mongod"
            fi
        else
            echo "   ⚠️  Не удалось запустить MongoDB через systemctl"
            echo "   💡 Попробуйте вручную: sudo mongod --dbpath /var/lib/mongodb"
        fi
    fi
else
    echo "   ❌ MongoDB не установлен"
    echo "   💡 Установите MongoDB:"
    echo "      sudo apt update"
    echo "      sudo apt install -y mongodb"
fi

echo ""

# 2. Запуск Docker (если нужно)
echo "2️⃣ Проверка Docker..."
if command -v docker &> /dev/null; then
    if docker info > /dev/null 2>&1; then
        echo "   ✅ Docker daemon запущен"
    else
        echo "   🔄 Запускаем Docker daemon..."
        if sudo systemctl start docker 2>/dev/null; then
            sleep 2
            if docker info > /dev/null 2>&1; then
                echo "   ✅ Docker daemon успешно запущен"
            else
                echo "   ❌ Не удалось запустить Docker daemon"
                echo "   💡 Добавьте пользователя в группу docker: sudo usermod -aG docker $USER"
                echo "   💡 Затем перелогиньтесь или выполните: newgrp docker"
            fi
        else
            echo "   ❌ Не удалось запустить Docker daemon"
        fi
    fi
else
    echo "   ❌ Docker не установлен"
    echo "   💡 Установите Docker: ./scripts/install-docker.sh"
fi

echo ""

# 3. Запуск LibreTranslate
echo "3️⃣ Запуск LibreTranslate..."
if docker ps --format '{{.Names}}' | grep -q "^libretranslate$"; then
    echo "   ✅ LibreTranslate уже запущен"
elif docker ps -a --format '{{.Names}}' | grep -q "^libretranslate$"; then
    echo "   🔄 Запускаем существующий контейнер LibreTranslate..."
    if docker start libretranslate > /dev/null 2>&1; then
        sleep 3
        if docker ps --format '{{.Names}}' | grep -q "^libretranslate$"; then
            echo "   ✅ LibreTranslate успешно запущен"
            
            # Ждем, пока API станет доступен
            echo "   ⏳ Ожидание готовности API..."
            for i in {1..30}; do
                if curl -s http://localhost:5000/languages > /dev/null 2>&1; then
                    echo "   ✅ LibreTranslate API готов"
                    break
                fi
                sleep 1
            done
        else
            echo "   ❌ Не удалось запустить LibreTranslate"
            echo "   💡 Проверьте логи: docker logs libretranslate"
        fi
    else
        echo "   ❌ Ошибка при запуске контейнера"
    fi
else
    echo "   🔄 Создаем и запускаем контейнер LibreTranslate..."
    if docker run -d -p 5000:5000 --name libretranslate libretranslate/libretranslate > /dev/null 2>&1; then
        echo "   ✅ Контейнер LibreTranslate создан и запущен"
        
        # Ждем, пока API станет доступен
        echo "   ⏳ Ожидание готовности API (это может занять 30-60 секунд)..."
        for i in {1..60}; do
            if curl -s http://localhost:5000/languages > /dev/null 2>&1; then
                echo "   ✅ LibreTranslate API готов"
                break
            fi
            if [ $i -eq 60 ]; then
                echo "   ⚠️  API еще не готов, но контейнер запущен"
                echo "   💡 Проверьте статус: docker logs libretranslate"
            fi
            sleep 1
        done
    else
        echo "   ❌ Не удалось создать контейнер LibreTranslate"
        echo "   💡 Проверьте, что Docker запущен и у вас есть права"
    fi
fi

echo ""

# 4. Финальная проверка
echo "4️⃣ Финальная проверка..."
ALL_OK=true

if ! pgrep -x "mongod" > /dev/null; then
    echo "   ❌ MongoDB не запущен"
    ALL_OK=false
else
    echo "   ✅ MongoDB запущен"
fi

if ! docker ps --format '{{.Names}}' | grep -q "^libretranslate$"; then
    echo "   ❌ LibreTranslate не запущен"
    ALL_OK=false
else
    echo "   ✅ LibreTranslate запущен"
fi

echo ""

if [ "$ALL_OK" = true ]; then
    echo "✅ Все сервисы запущены и готовы к работе!"
    echo ""
    echo "📝 Теперь можно запустить перевод:"
    echo "   npm run db:translate-products-fast"
else
    echo "⚠️  Некоторые сервисы не запущены. Проверьте вывод выше."
    echo ""
    echo "💡 Для диагностики выполните:"
    echo "   ./scripts/check-services.sh"
fi

echo ""

