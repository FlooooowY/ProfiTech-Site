# Инструкция по развертыванию на VPS сервере

## Подготовка

### 1. Требования
- VPS с Ubuntu 20.04+ или Debian 11+
- Минимум 4 vCPU, 8 GB RAM, 120 GB SSD
- Root доступ или пользователь с sudo правами
- Доменное имя (например, profitech.store)

---

## Шаг 1: Подключение к серверу

### Через SSH:
```bash
ssh root@ваш-ip-адрес
# или
ssh ваш-пользователь@ваш-ip-адрес
```

---

## Шаг 2: Обновление системы

```bash
# Обновите систему
sudo apt update && sudo apt upgrade -y

# Установите необходимые пакеты
sudo apt install -y curl wget git build-essential
```

---

## Шаг 3: Установка Node.js 20

### Через NVM (рекомендуется):

```bash
# Установите NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Перезагрузите конфигурацию
source ~/.bashrc

# Установите Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Проверьте версию
node --version  # Должно быть v20.x.x
npm --version
```

### Альтернатива: Через NodeSource (если NVM не подходит)

```bash
# Установите Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверьте версию
node --version
npm --version
```

---

## Шаг 4: Установка MySQL

```bash
# Установите MySQL
sudo apt install -y mysql-server

# Запустите MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Настройте безопасность MySQL
sudo mysql_secure_installation

# Войдите в MySQL и создайте базу данных
sudo mysql -u root -p
```

### В MySQL консоли:

```sql
-- Создайте базу данных
CREATE DATABASE u3364352_default CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Создайте пользователя
CREATE USER 'u3364352_default'@'localhost' IDENTIFIED BY 'nDpDE4luD7G84uk3!@#';

-- Выдайте права
GRANT ALL PRIVILEGES ON u3364352_default.* TO 'u3364352_default'@'localhost';

-- Примените изменения
FLUSH PRIVILEGES;

-- Выйдите
EXIT;
```

### Оптимизация MySQL для вашего VPS:

```bash
# Отредактируйте конфигурацию MySQL
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Добавьте/измените следующие параметры:

```ini
[mysqld]
# Буферный пул InnoDB (для 8GB RAM используйте 2-3GB)
innodb_buffer_pool_size = 2G

# Максимальное количество соединений
max_connections = 200

# Кэш запросов
query_cache_type = 1
query_cache_size = 128M
query_cache_limit = 4M

# Логирование медленных запросов
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow-query.log
long_query_time = 2
```

Перезапустите MySQL:

```bash
sudo systemctl restart mysql
```

---

## Шаг 5: Установка Nginx

```bash
# Установите Nginx
sudo apt install -y nginx

# Запустите Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Проверьте статус
sudo systemctl status nginx
```

---

## Шаг 6: Создание пользователя для приложения

```bash
# Создайте пользователя (если еще не создан)
sudo adduser --disabled-password --gecos "" profitech

# Добавьте в группу sudo (опционально)
sudo usermod -aG sudo profitech

# Переключитесь на пользователя
su - profitech
```

---

## Шаг 7: Клонирование проекта

```bash
# Перейдите в домашнюю директорию
cd ~

# Клонируйте репозиторий
git clone https://github.com/FlooooowY/ProfiTech-Site.git

# Перейдите в директорию проекта
cd ProfiTech-Site
```

---

## Шаг 8: Настройка переменных окружения

```bash
# Скопируйте шаблон
cp env.template .env.local

# Файл уже настроен с правильными данными, но проверьте:
cat .env.local
```

Должно быть:
```env
DB_HOST=localhost
DB_USER=u3364352_default
DB_PASSWORD=nDpDE4luD7G84uk3!@#
DB_NAME=u3364352_default
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://profitech.store
```

---

## Шаг 9: Проверка версии Node.js

**Важно:** Убедитесь, что используется правильная версия Node.js.

```bash
# Проверьте версию Node.js
node --version
# Должно быть v20.x.x или v18.17+

# Если версия неправильная, переключитесь на нужную версию
nvm use 20

# Или установите заново
nvm install 20
nvm use 20
nvm alias default 20

# Проверьте версию npm
npm --version
```

---

## Шаг 10: Установка зависимостей

```bash
# Очистите кэш npm (если были проблемы)
npm cache clean --force

# Установите зависимости (с увеличенным лимитом памяти)
NODE_OPTIONS="--max-old-space-size=4096" npm install

# Если не хватает памяти, установите по частям:
# Сначала основные зависимости
NODE_OPTIONS="--max-old-space-size=2048" npm install --save next react react-dom mysql2 zustand framer-motion lucide-react react-icons papaparse csv-parse @tanstack/react-query

# Затем TypeScript и типы
NODE_OPTIONS="--max-old-space-size=2048" npm install --save-dev typescript @types/node @types/react @types/react-dom @types/papaparse

# Остальные devDependencies
NODE_OPTIONS="--max-old-space-size=2048" npm install --save-dev eslint eslint-config-next tailwindcss @tailwindcss/postcss tsx
```

---

## Шаг 11: Создание таблиц в базе данных

```bash
# Создайте таблицы
npm run db:create
```

**Ожидаемый результат:**
```
Connected to MySQL database
✓ Table "categories" created
✓ Table "subcategories" created
✓ Table "products" created with optimized indexes
✓ Table "product_characteristics" created with optimized indexes
✓ Table "filter_cache" created
✅ All tables created successfully!
```

---

## Шаг 12: Импорт категорий

```bash
# Импортируйте категории и подкатегории
npm run db:import-categories
```

**Ожидаемый результат:**
```
✓ Imported 7 categories
✓ Imported 41 subcategories
✅ All categories and subcategories imported successfully!
```

---

## Шаг 13: Сборка проекта

```bash
# Соберите production версию
npm run build
```

**Ожидаемый результат:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

---

## Шаг 14: Установка PM2 (менеджер процессов)

```bash
# Установите PM2 глобально
sudo npm install -g pm2

# Запустите приложение через PM2
pm2 start npm --name "profitech" -- start

# Сохраните конфигурацию
pm2 save

# Настройте автозапуск
pm2 startup
# Выполните команду, которую выдаст PM2 (обычно что-то вроде: sudo env PATH=...)

# Проверьте статус
pm2 status
pm2 logs profitech
```

---

## Шаг 15: Настройка Nginx

```bash
# Создайте конфигурацию для вашего сайта
sudo nano /etc/nginx/sites-available/profitech.store
```

Добавьте следующую конфигурацию:

```nginx
server {
    listen 80;
    server_name profitech.store www.profitech.store;

    # Логи
    access_log /var/log/nginx/profitech-access.log;
    error_log /var/log/nginx/profitech-error.log;

    # Максимальный размер загружаемого файла
    client_max_body_size 100M;

    # Проксирование на Next.js приложение
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Кэширование статических файлов
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Кэширование изображений
    location /images {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Активируйте конфигурацию:

```bash
# Создайте символическую ссылку
sudo ln -s /etc/nginx/sites-available/profitech.store /etc/nginx/sites-enabled/

# Проверьте конфигурацию
sudo nginx -t

# Перезагрузите Nginx
sudo systemctl reload nginx
```

---

## Шаг 16: Настройка SSL (Let's Encrypt)

**Важно:** Перед получением SSL сертификата убедитесь, что:
1. Домен `profitech.store` указывает на IP-адрес вашего VPS (DNS настроен)
2. Порты 80 и 443 открыты в файрволе
3. Nginx запущен и доступен из интернета

### Проверка DNS:

```bash
# Проверьте, что домен указывает на ваш IP
dig profitech.store +short
# или
nslookup profitech.store

# Должен вернуться IP-адрес вашего VPS
```

### Настройка Nginx для ACME challenge:

```bash
# Отредактируйте конфигурацию Nginx
sudo nano /etc/nginx/sites-available/profitech.store
```

Убедитесь, что в конфигурации есть блок для ACME challenge:

```nginx
server {
    listen 80;
    server_name profitech.store www.profitech.store;

    # ACME challenge для Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Временный редирект на приложение (до получения SSL)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Проверьте конфигурацию
sudo nginx -t

# Перезагрузите Nginx
sudo systemctl reload nginx
```

### Создайте директорию для ACME challenge:

```bash
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

### Получите SSL сертификат:

```bash
# Установите Certbot (если еще не установлен)
sudo apt install -y certbot python3-certbot-nginx

# Получите SSL сертификат
sudo certbot --nginx -d profitech.store -d www.profitech.store

# Если все настроено правильно, Certbot автоматически:
# - Получит сертификат
# - Обновит конфигурацию Nginx
# - Настроит редирект с HTTP на HTTPS
```

### Если все еще не работает:

1. **Проверьте доступность домена:**
   ```bash
   curl -I http://profitech.store
   # Должен вернуть HTTP 200 или 301
   ```

2. **Проверьте файрвол:**
   ```bash
   sudo ufw status
   # Убедитесь, что порты 80 и 443 открыты
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

3. **Проверьте логи Nginx:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Попробуйте получить сертификат в режиме standalone (если Nginx мешает):**
   ```bash
   # Остановите Nginx временно
   sudo systemctl stop nginx
   
   # Получите сертификат
   sudo certbot certonly --standalone -d profitech.store -d www.profitech.store
   
   # Запустите Nginx
   sudo systemctl start nginx
   
   # Настройте Nginx вручную для использования сертификата
   ```

### Проверьте автопродление:

```bash
sudo certbot renew --dry-run
```

---

## Шаг 17: Настройка файрвола

```bash
# Установите UFW (если еще не установлен)
sudo apt install -y ufw

# Разрешите SSH
sudo ufw allow 22/tcp

# Разрешите HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включите файрвол
sudo ufw enable

# Проверьте статус
sudo ufw status
```

---

## Шаг 18: Загрузка каталога товаров

1. **Откройте админ-панель:** `https://profitech.store/admin`
2. **Нажмите "Запустить импорт каталога"**
3. **Дождитесь завершения импорта** (это может занять несколько минут)
4. **Проверьте, что файл создан:** `public/data/products.json` должен появиться

---

## Шаг 19: Импорт товаров в MySQL

```bash
# Перейдите в директорию проекта
cd ~/ProfiTech-Site

# Импортируйте товары
npm run db:import-products
```

**Ожидаемый результат:**
```
Connected to MySQL database
Reading products from JSON...
Found X products to import
Clearing existing data...
✓ Existing data cleared
✓ Imported X/X products
✓ Imported Y characteristics
✅ All products imported successfully!
```

---

## Шаг 20: Создание swap файла (рекомендуется)

```bash
# Создайте swap файл 4GB
sudo fallocate -l 4G /swapfile

# Установите права
sudo chmod 600 /swapfile

# Создайте swap
sudo mkswap /swapfile

# Активируйте swap
sudo swapon /swapfile

# Сделайте постоянным (добавьте в /etc/fstab)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Проверьте
free -h
```

---

## Шаг 21: Проверка работы

1. **Откройте сайт:** `https://profitech.store`
2. **Проверьте каталог:** `https://profitech.store/catalog` - товары должны отображаться
3. **Проверьте фильтрацию:** попробуйте выбрать категорию, производителя
4. **Проверьте поиск:** введите название товара в поиск
5. **Проверьте API:**
   - `https://profitech.store/api/catalog?page=1&limit=24`
   - `https://profitech.store/api/catalog/stats`

---

## Полезные команды

### Управление приложением:

```bash
# Статус PM2
pm2 status

# Логи приложения
pm2 logs profitech

# Перезапуск приложения
pm2 restart profitech

# Остановка приложения
pm2 stop profitech

# Мониторинг
pm2 monit
```

### Управление MySQL:

```bash
# Войти в MySQL
mysql -u u3364352_default -p

# Проверить размер базы данных
mysql -u u3364352_default -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.tables WHERE table_schema = 'u3364352_default' GROUP BY table_schema;"

# Проверить количество товаров
mysql -u u3364352_default -p -e "SELECT COUNT(*) as total_products FROM products;" u3364352_default
```

### Управление Nginx:

```bash
# Проверить конфигурацию
sudo nginx -t

# Перезагрузить Nginx
sudo systemctl reload nginx

# Статус Nginx
sudo systemctl status nginx

# Логи Nginx
sudo tail -f /var/log/nginx/profitech-error.log
```

---

## Обновление приложения

### Когда нужно обновить код:

```bash
# Перейдите в директорию проекта
cd ~/ProfiTech-Site

# Получите последние изменения
git pull origin main

# Установите новые зависимости (если есть)
NODE_OPTIONS="--max-old-space-size=4096" npm install

# Пересоберите приложение
npm run build

# Перезапустите через PM2
pm2 restart profitech
```

### Когда нужно обновить товары:

1. Откройте `/admin` на сайте
2. Запустите импорт
3. Выполните: `npm run db:import-products`
4. Перезапустите приложение: `pm2 restart profitech`

---

## Резервное копирование

### Создание бэкапа базы данных:

```bash
# Создайте директорию для бэкапов
mkdir -p ~/backups

# Создайте бэкап
mysqldump -u u3364352_default -p u3364352_default > ~/backups/db_backup_$(date +%Y%m%d_%H%M%S).sql

# Создайте сжатый бэкап
mysqldump -u u3364352_default -p u3364352_default | gzip > ~/backups/db_backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Автоматическое резервное копирование (cron):

```bash
# Откройте crontab
crontab -e

# Добавьте задачу (каждый день в 3:00)
0 3 * * * mysqldump -u u3364352_default -pnDpDE4luD7G84uk3 u3364352_default | gzip > ~/backups/db_backup_$(date +\%Y\%m\%d).sql.gz
```

---

## Мониторинг

### Установка мониторинга (опционально):

```bash
# PM2 мониторинг
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Проверка использования ресурсов:

```bash
# Использование CPU и памяти
htop

# Использование диска
df -h

# Использование памяти
free -h

# Статус процессов
pm2 status
```

---

## Решение проблем

### Приложение не запускается:

1. Проверьте логи: `pm2 logs profitech`
2. Проверьте `.env.local` файл
3. Проверьте, что порт 3000 свободен: `sudo netstat -tulpn | grep 3000`
4. Проверьте версию Node.js: `node --version`

### Ошибка подключения к БД:

1. Проверьте `.env.local` файл
2. Проверьте, что MySQL запущен: `sudo systemctl status mysql`
3. Проверьте права пользователя БД
4. Проверьте подключение: `mysql -u u3364352_default -p`

### Медленная работа:

1. Проверьте использование ресурсов: `htop`
2. Проверьте индексы БД: `npm run db:create` (если нужно пересоздать)
3. Очистите кэш Next.js: удалите папку `.next` и пересоберите
4. Проверьте логи MySQL: `sudo tail -f /var/log/mysql/slow-query.log`

### Nginx не работает:

1. Проверьте конфигурацию: `sudo nginx -t`
2. Проверьте логи: `sudo tail -f /var/log/nginx/error.log`
3. Проверьте статус: `sudo systemctl status nginx`

---

## Безопасность

### Рекомендации:

1. **Регулярно обновляйте систему:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Используйте сильные пароли** для MySQL и SSH

3. **Настройте SSH ключи** вместо паролей:
   ```bash
   # На вашем компьютере
   ssh-keygen -t rsa -b 4096
   ssh-copy-id ваш-пользователь@ваш-ip
   ```

4. **Отключите вход по паролю** (после настройки ключей):
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Установите: PasswordAuthentication no
   sudo systemctl restart sshd
   ```

5. **Регулярно делайте бэкапы** базы данных

6. **Мониторьте логи** на наличие подозрительной активности

---

## Дополнительные настройки для Telegram бота

Если вы планируете запускать Telegram бота на том же сервере:

1. **Создайте отдельный PM2 процесс:**
   ```bash
   pm2 start your-bot.js --name "telegram-bot"
   pm2 save
   ```

2. **Учтите использование ресурсов:**
   - Telegram бот: ~100-300 MB RAM
   - У вас достаточно ресурсов для обоих приложений

3. **Настройте мониторинг:**
   ```bash
   pm2 monit
   ```

---

## Итоговая структура

```
/home/profitech/
├── ProfiTech-Site/          # Проект
│   ├── .env.local          # Переменные окружения
│   ├── .next/              # Собранное приложение
│   ├── node_modules/       # Зависимости
│   └── public/
│       └── data/
│           └── products.json
├── backups/                # Бэкапы БД
└── .pm2/                   # PM2 конфигурация
```

---

**Готово!** Ваш сайт должен быть доступен по адресу `https://profitech.store`

