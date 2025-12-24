# Исправление проблем с запуском сайта profitech.store

## Проблема
Сайт https://profitech.store/ не запускается.

## Решение

### 1. Установка зависимостей

На сервере выполните:

```bash
cd /path/to/ProfiTech-Site
npm install
```

**Важно:** Убедитесь, что в `package.json` удалён проблемный пакет `translate-google@^1.5.1`, так как такой версии не существует.

### 2. Настройка переменных окружения

Создайте файл `.env` или `.env.local` на сервере:

```bash
# MongoDB Database Configuration
MONGODB_URI=mongodb://admin_db:admin_db@localhost:27017/profitech_db?authSource=admin
# Или отдельные параметры:
DB_HOST=localhost
DB_USER=admin_db
DB_PASSWORD=admin_db
DB_NAME=profitech_db

# Next.js Configuration
NODE_ENV=production

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://profitech.store
```

### 3. Проверка MongoDB

Убедитесь, что MongoDB запущен и доступен:

```bash
# Проверка статуса MongoDB
sudo systemctl status mongod

# Если не запущен, запустите:
sudo systemctl start mongod
sudo systemctl enable mongod

# Проверка подключения
npm run db:check
```

### 4. Пересборка проекта

```bash
# Очистка предыдущей сборки
rm -rf .next
rm -rf node_modules/.cache

# Установка зависимостей
npm install

# Сборка проекта
npm run build
```

### 5. Запуск приложения

#### Вариант A: PM2 (рекомендуется)

```bash
# Установка PM2 (если не установлен)
npm install -g pm2

# Запуск приложения
pm2 start npm --name "profitech" -- start

# Сохранение конфигурации PM2
pm2 save
pm2 startup
```

#### Вариант B: systemd service

Создайте файл `/etc/systemd/system/profitech.service`:

```ini
[Unit]
Description=ProfiTech Next.js App
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/ProfiTech-Site
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Затем:

```bash
sudo systemctl daemon-reload
sudo systemctl enable profitech
sudo systemctl start profitech
sudo systemctl status profitech
```

#### Вариант C: Docker (если используется)

```bash
docker-compose up -d --build
```

### 6. Проверка Nginx конфигурации

Убедитесь, что Nginx правильно настроен:

```bash
# Проверка конфигурации
sudo nginx -t

# Перезагрузка Nginx
sudo systemctl reload nginx

# Проверка статуса
sudo systemctl status nginx
```

Пример конфигурации Nginx для `/etc/nginx/sites-available/profitech.store`:

```nginx
server {
    listen 80;
    server_name profitech.store www.profitech.store;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7. Проверка портов и файрвола

```bash
# Проверка, что порт 3000 открыт
sudo netstat -tulpn | grep 3000

# Если используется файрвол, откройте порты:
sudo ufw allow 3000/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 8. Проверка логов

```bash
# Логи Next.js приложения
pm2 logs profitech
# или
journalctl -u profitech -f

# Логи Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Логи MongoDB
sudo tail -f /var/log/mongodb/mongod.log
```

### 9. Проверка DNS

Убедитесь, что домен правильно настроен:

```bash
# Проверка DNS записей
dig profitech.store
nslookup profitech.store

# Должна быть A-запись, указывающая на IP вашего сервера
```

### 10. Быстрая диагностика

Выполните скрипты проверки:

```bash
# Проверка сервисов
npm run services:check

# Проверка сайта
npm run site:check

# Проверка домена
npm run domain:check
```

## Частые проблемы и решения

### Проблема: "Cannot find module 'next-intl/plugin'"
**Решение:** Выполните `npm install` для установки всех зависимостей.

### Проблема: MongoDB connection error
**Решение:** 
1. Проверьте, что MongoDB запущен: `sudo systemctl status mongod`
2. Проверьте переменные окружения в `.env`
3. Проверьте права доступа к базе данных

### Проблема: Port 3000 already in use
**Решение:**
```bash
# Найти процесс, использующий порт 3000
sudo lsof -i :3000

# Убить процесс
sudo kill -9 <PID>
```

### Проблема: 502 Bad Gateway
**Решение:**
1. Проверьте, что Next.js приложение запущено на порту 3000
2. Проверьте конфигурацию Nginx
3. Проверьте логи Nginx: `sudo tail -f /var/log/nginx/error.log`

### Проблема: 500 Internal Server Error
**Решение:**
1. Проверьте логи приложения: `pm2 logs profitech`
2. Проверьте переменные окружения
3. Проверьте подключение к MongoDB

## После исправления

1. Проверьте доступность сайта: `curl https://profitech.store`
2. Проверьте в браузере: https://profitech.store
3. Проверьте все основные страницы:
   - Главная: https://profitech.store/
   - Каталог: https://profitech.store/catalog
   - О компании: https://profitech.store/about
   - Контакты: https://profitech.store/contacts

## Контакты для поддержки

Если проблема не решена, проверьте:
- Логи приложения
- Логи Nginx
- Логи MongoDB
- Статус всех сервисов

---

**Дата создания:** 2025-12-24
**Версия:** 1.0

