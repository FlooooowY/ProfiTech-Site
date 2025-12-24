#!/bin/bash

# Альтернативный способ получения SSL сертификата через standalone режим
# Использование: ./scripts/get-ssl-standalone.sh

set -e

echo "🔒 Получение SSL сертификата через standalone режим..."
echo ""
echo "⚠️  ВНИМАНИЕ: Этот метод временно остановит Nginx!"
echo "   Нажмите Ctrl+C для отмены или подождите 5 секунд..."
sleep 5

# 1. Останавливаем Nginx
echo ""
echo "1️⃣  Остановка Nginx..."
sudo systemctl stop nginx
echo "   ✅ Nginx остановлен"

# 2. Получаем сертификат в standalone режиме
echo ""
echo "2️⃣  Получение SSL сертификата..."
if sudo certbot certonly --standalone \
    --preferred-challenges http \
    -d profitech.store \
    -d www.profitech.store \
    --non-interactive \
    --agree-tos \
    --email admin@profitech.store; then
    echo "   ✅ Сертификат успешно получен!"
else
    echo "   ❌ Не удалось получить сертификат"
    echo "   Запускаем Nginx обратно..."
    sudo systemctl start nginx
    exit 1
fi

# 3. Запускаем Nginx обратно
echo ""
echo "3️⃣  Запуск Nginx..."
sudo systemctl start nginx
echo "   ✅ Nginx запущен"

# 4. Настраиваем Nginx для использования сертификата
echo ""
echo "4️⃣  Настройка Nginx для использования SSL..."
if sudo certbot --nginx -d profitech.store -d www.profitech.store --non-interactive; then
    echo "   ✅ Nginx настроен для SSL"
else
    echo "   ⚠️  Автоматическая настройка не удалась"
    echo "   Настройте вручную согласно docs/NGINX_CONFIG.md"
fi

# 5. Проверка
echo ""
echo "5️⃣  Проверка HTTPS..."
if curl -I https://profitech.store 2>&1 | head -1 | grep -q "200\|301\|302"; then
    echo "   ✅ HTTPS работает!"
else
    echo "   ⚠️  HTTPS пока не доступен (может потребоваться время)"
fi

echo ""
echo "✅ Готово!"
echo ""
echo "📋 Проверьте:"
echo "   - https://profitech.store"
echo "   - https://www.profitech.store"
echo ""
echo "📝 Автоматическое обновление сертификата уже настроено"

