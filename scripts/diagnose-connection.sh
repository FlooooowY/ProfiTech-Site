#!/bin/bash

echo "🔍 Детальная диагностика подключения..."
echo ""

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Проверка процесса
echo "1️⃣ Проверка процесса Node.js..."
if pgrep -f "next start" > /dev/null; then
    PID=$(pgrep -f "next start" | head -1)
    echo "   ✅ Процесс найден (PID: $PID)"
    ps aux | grep "next start" | grep -v grep
else
    echo "   ❌ Процесс не найден"
fi

echo ""

# 2. Проверка порта детально
echo "2️⃣ Детальная проверка порта 3000..."
if netstat -tuln 2>/dev/null | grep -q ":3000" || ss -tuln 2>/dev/null | grep -q ":3000"; then
    echo "   ✅ Порт 3000 открыт"
    if command -v netstat > /dev/null; then
        netstat -tuln | grep ":3000"
    else
        ss -tuln | grep ":3000"
    fi
else
    echo "   ❌ Порт 3000 не открыт"
fi

echo ""

# 3. Тест подключения к localhost:3000
echo "3️⃣ Тест подключения к localhost:3000..."
echo "   Пробую подключиться..."

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost:3000 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "301" ] || [ "$RESPONSE" = "302" ]; then
        echo "   ✅ Подключение успешно (HTTP $RESPONSE)"
    else
        echo "   ⚠️  Подключение есть, но HTTP код: $RESPONSE"
        echo "   Попробую получить заголовки:"
        curl -I http://localhost:3000 2>&1 | head -10
    fi
else
    echo "   ❌ Не удалось подключиться"
    echo "   Ошибка: $RESPONSE"
    echo ""
    echo "   Проверяю, может ли порт принимать соединения..."
    if timeout 2 bash -c "echo > /dev/tcp/localhost/3000" 2>/dev/null; then
        echo "   ✅ Порт принимает соединения"
    else
        echo "   ❌ Порт не принимает соединения"
    fi
fi

echo ""

# 4. Проверка логов PM2
echo "4️⃣ Последние логи PM2 (последние 20 строк)..."
pm2 logs profitech --lines 20 --nostream 2>&1 | tail -20

echo ""

# 5. Проверка переменных окружения PM2
echo "5️⃣ Проверка переменных окружения PM2..."
pm2 show profitech | grep -A 10 "env"

echo ""

# 6. Тест через другой метод
echo "6️⃣ Альтернативный тест подключения..."
if command -v wget > /dev/null; then
    echo "   Используя wget..."
    wget -O /dev/null -T 5 http://localhost:3000 2>&1 | head -5
elif command -v nc > /dev/null; then
    echo "   Используя netcat..."
    echo "GET / HTTP/1.1\r\nHost: localhost\r\n\r\n" | nc -w 2 localhost 3000 2>&1 | head -5
else
    echo "   wget и nc не установлены, пропускаю"
fi

echo ""

# 7. Проверка файрвола
echo "7️⃣ Проверка файрвола..."
if command -v ufw > /dev/null; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null | head -1)
    echo "   Статус UFW: $UFW_STATUS"
    if echo "$UFW_STATUS" | grep -q "inactive"; then
        echo "   ✅ Файрвол неактивен (это нормально)"
    else
        echo "   ⚠️  Файрвол активен, проверьте правила для порта 3000"
    fi
else
    echo "   UFW не установлен"
fi

echo ""

# 8. Рекомендации
echo "📋 Рекомендации:"
echo ""

if [ $EXIT_CODE -ne 0 ] || [ "$RESPONSE" != "200" ]; then
    echo "   🔧 Попробуйте перезапустить приложение:"
    echo "      pm2 restart profitech"
    echo ""
    echo "   🔧 Проверьте, что приложение запускается правильно:"
    echo "      pm2 logs profitech --lines 50"
    echo ""
    echo "   🔧 Попробуйте запустить приложение вручную для отладки:"
    echo "      cd ~/ProfiTech-Site"
    echo "      pm2 stop profitech"
    echo "      npm start"
    echo "      # (Затем проверьте в другом терминале: curl http://localhost:3000)"
    echo ""
fi

echo "   📝 Полные логи:"
echo "      pm2 logs profitech --lines 100"
echo ""

