#!/bin/bash

# Скрипт для исправления конфликта имен серверов в Nginx
# Использование: ./scripts/fix-nginx-conflict.sh

set -e

echo "🔍 Поиск конфликтующих конфигураций..."

# Находим все файлы с доменом
echo "📋 Файлы с server_name profitech.store:"
sudo grep -r "server_name.*profitech.store" /etc/nginx/ || echo "Не найдено"

echo ""
echo "📁 Активные конфигурации:"
ls -la /etc/nginx/sites-enabled/

echo ""
echo "🔧 Исправление конфликта..."

# Удаляем дефолтную конфигурацию, если она существует
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "⚠️  Найден файл default, удаляем..."
    sudo rm /etc/nginx/sites-enabled/default
    echo "✅ Файл default удален"
else
    echo "ℹ️  Файл default не найден"
fi

# Проверяем, есть ли файл profitech
if [ ! -f /etc/nginx/sites-enabled/profitech ]; then
    echo "⚠️  Файл profitech не найден в sites-enabled"
    if [ -f /etc/nginx/sites-available/profitech ]; then
        echo "🔗 Создаем символическую ссылку..."
        sudo ln -s /etc/nginx/sites-available/profitech /etc/nginx/sites-enabled/profitech
        echo "✅ Ссылка создана"
    else
        echo "❌ Файл /etc/nginx/sites-available/profitech не найден!"
        echo "   Создайте его согласно инструкции в docs/NGINX_CONFIG.md"
        exit 1
    fi
fi

# Проверяем конфигурацию
echo ""
echo "🔍 Проверка конфигурации Nginx..."
if sudo nginx -t; then
    echo "✅ Конфигурация корректна"
    
    # Перезагружаем Nginx
    echo ""
    echo "🔄 Перезагрузка Nginx..."
    sudo systemctl reload nginx
    
    echo ""
    echo "✅ Готово! Проверьте статус:"
    echo "   sudo systemctl status nginx"
else
    echo "❌ Ошибка в конфигурации Nginx!"
    echo "   Проверьте файлы вручную"
    exit 1
fi

# Проверяем, остались ли конфликты
echo ""
echo "🔍 Финальная проверка конфликтов:"
CONFLICTS=$(sudo grep -r "server_name.*profitech.store" /etc/nginx/sites-enabled/ | wc -l)
if [ "$CONFLICTS" -le "1" ]; then
    echo "✅ Конфликтов не обнаружено"
else
    echo "⚠️  Все еще есть конфликты. Проверьте вручную:"
    sudo grep -r "server_name.*profitech.store" /etc/nginx/sites-enabled/
fi

