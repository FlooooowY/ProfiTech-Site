#!/bin/bash

# Скрипт для исправления проблемы с ACME challenge
# Использование: ./scripts/fix-acme-challenge.sh

set -e

NGINX_CONF="/etc/nginx/sites-available/profitech"

echo "🔧 Исправление проблемы с ACME challenge..."

# 1. Проверяем текущую конфигурацию
echo "1️⃣  Проверка текущей конфигурации..."
if [ ! -f "$NGINX_CONF" ]; then
    echo "❌ Файл $NGINX_CONF не найден!"
    exit 1
fi

# 2. Создаем резервную копию
echo "💾 Создание резервной копии..."
sudo cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"

# 3. Проверяем конфликтующие конфигурации
echo ""
echo "2️⃣  Проверка конфликтующих конфигураций..."
CONFLICTING=$(sudo grep -r "server_name.*profitech.store" /etc/nginx/sites-enabled/ 2>/dev/null | wc -l)
if [ "$CONFLICTING" -gt "1" ]; then
    echo "⚠️  Найдено несколько конфигураций с profitech.store"
    echo "   Удаляем дефолтную конфигурацию..."
    sudo rm -f /etc/nginx/sites-enabled/default
    echo "✅ Конфликтующие конфигурации удалены"
fi

# 4. Проверяем и исправляем блок ACME challenge
echo ""
echo "3️⃣  Проверка блока ACME challenge..."

# Удаляем старый блок, если он есть
if grep -q "\.well-known/acme-challenge" "$NGINX_CONF"; then
    echo "   Удаляем старый блок..."
    sudo sed -i '/\.well-known\/acme-challenge/,/}/d' "$NGINX_CONF"
fi

# Находим строку с первым location / и добавляем блок ПЕРЕД ней
echo "   Добавляем правильный блок..."

# Используем Python для надежной вставки
sudo python3 << 'PYTHON_SCRIPT'
import re

conf_file = "/etc/nginx/sites-available/profitech"

acme_block = """    # ВАЖНО: Блок для Let's Encrypt ACME challenge (должен быть ПЕРЕД location /)
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }

"""

# Читаем файл
with open(conf_file, 'r') as f:
    lines = f.readlines()

# Находим индекс первого location / (не в комментарии)
location_idx = None
for i, line in enumerate(lines):
    if re.match(r'^\s*location\s+/\s+\{', line):
        location_idx = i
        break

if location_idx is None:
    print("❌ Не найдено location / в конфигурации")
    exit(1)

# Вставляем блок перед location /
acme_lines = acme_block.split('\n')
for i, acme_line in enumerate(acme_lines):
    if acme_line.strip():  # Пропускаем пустые строки
        lines.insert(location_idx + i, acme_line + '\n')

# Записываем обратно
with open(conf_file, 'w') as f:
    f.writelines(lines)

print("✅ Блок ACME challenge добавлен перед location /")
PYTHON_SCRIPT

# 5. Убеждаемся, что нет редиректа на HTTPS (временно)
echo ""
echo "4️⃣  Проверка редиректов..."
if grep -q "^\s*return 301 https" "$NGINX_CONF"; then
    echo "   Отключаем редирект на HTTPS..."
    sudo sed -i 's/^\s*return 301 https/# &/' "$NGINX_CONF"
    echo "✅ Редирект отключен"
fi

# 6. Проверяем синтаксис
echo ""
echo "5️⃣  Проверка синтаксиса Nginx..."
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo "✅ Синтаксис корректен"
else
    echo "❌ Ошибка в конфигурации!"
    sudo nginx -t
    exit 1
fi

# 7. Перезагружаем Nginx
echo ""
echo "6️⃣  Перезагрузка Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx перезагружен"

# 8. Проверяем доступность ACME challenge
echo ""
echo "7️⃣  Проверка доступности ACME challenge..."
sleep 2
TEST_URL="http://profitech.store/.well-known/acme-challenge/test"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TEST_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "404" ]; then
    echo "✅ ACME challenge endpoint доступен (404 - это нормально для тестового файла)"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "⚠️  Не удалось подключиться"
else
    echo "⚠️  HTTP код: $HTTP_CODE (ожидался 404)"
fi

# 9. Проверяем порядок блоков
echo ""
echo "8️⃣  Проверка порядка блоков location:"
sudo grep -n "location" "$NGINX_CONF" | head -5

echo ""
echo "✅ Исправление завершено!"
echo ""
echo "📋 Теперь попробуйте получить сертификат:"
echo "   sudo certbot --nginx -d profitech.store -d www.profitech.store"
echo ""
echo "   Или используйте webroot метод:"
echo "   sudo certbot certonly --webroot -w /var/www/html -d profitech.store -d www.profitech.store"

