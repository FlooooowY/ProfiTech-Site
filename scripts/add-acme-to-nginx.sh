#!/bin/bash

# Скрипт для автоматического добавления блока ACME challenge в конфигурацию Nginx
# Использование: ./scripts/add-acme-to-nginx.sh

set -e

NGINX_CONF="/etc/nginx/sites-available/profitech"

echo "🔧 Добавление блока ACME challenge в конфигурацию Nginx..."

# Проверяем, существует ли файл
if [ ! -f "$NGINX_CONF" ]; then
    echo "❌ Файл $NGINX_CONF не найден!"
    echo "   Создайте его согласно инструкции в docs/NGINX_CONFIG.md"
    exit 1
fi

# Проверяем, есть ли уже блок
if grep -q "\.well-known/acme-challenge" "$NGINX_CONF"; then
    echo "✅ Блок для ACME challenge уже существует"
    exit 0
fi

# Создаем резервную копию
echo "💾 Создание резервной копии..."
sudo cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"

# Ищем место для вставки (перед первым location /)
echo "📝 Добавление блока ACME challenge..."

# Используем Python для добавления блока (более надежно, чем sed с многострочными строками)
sudo python3 << EOF
import re

conf_file = "$NGINX_CONF"
acme_block = """    # ВАЖНО: Блок для Let's Encrypt ACME challenge (должен быть ПЕРЕД location /)
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files \$uri =404;
    }
"""

# Читаем файл
with open(conf_file, 'r') as f:
    content = f.read()

# Ищем первое вхождение "location / {" и вставляем блок перед ним
pattern = r'(\s+)(location\s+/\s+\{)'
replacement = r'\1' + acme_block + r'\1\2'

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content, count=1)
    
    # Записываем обратно
    with open(conf_file, 'w') as f:
        f.write(content)
    print("✅ Блок добавлен успешно")
else:
    print("⚠️  Не найдено 'location / {' в конфигурации")
    print("   Добавьте блок вручную перед первым location блоком")
    exit(1)
EOF

echo "✅ Блок добавлен"

# Проверяем синтаксис
echo ""
echo "🔍 Проверка синтаксиса Nginx..."
if sudo nginx -t; then
    echo "✅ Синтаксис корректен"
    
    # Перезагружаем Nginx
    echo ""
    echo "🔄 Перезагрузка Nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx перезагружен"
    
    # Проверяем, что блок добавлен
    echo ""
    echo "🔍 Проверка добавленного блока:"
    sudo grep -A 3 "\.well-known/acme-challenge" "$NGINX_CONF"
    
    echo ""
    echo "✅ Готово! Теперь можно получить SSL сертификат:"
    echo "   sudo certbot --nginx -d profitech.store -d www.profitech.store"
else
    echo "❌ Ошибка в конфигурации Nginx!"
    echo "   Восстанавливаем резервную копию..."
    sudo cp "${NGINX_CONF}.backup."* "$NGINX_CONF" 2>/dev/null || true
    echo "   Проверьте конфигурацию вручную: sudo nano $NGINX_CONF"
    exit 1
fi

