# 🚀 Пошаговая инструкция по установке на новый сервер

## 📋 Что нужно перед началом:

1. **VPS сервер** (Ubuntu 20.04+ или Debian 11+)
   - Минимум: 4 vCPU, 8 GB RAM, 120 GB SSD
   - Root доступ или пользователь с sudo правами

2. **Доменное имя** (например, profitech.store)
   - Доступ к панели управления доменом

3. **SSH доступ** к серверу

---

## 🎯 ШАГ 1: Настройка DNS (ВАЖНО! Сначала это!)

### 1.1. Узнайте IP адрес вашего VPS:

Подключитесь к серверу через SSH и выполните:
```bash
curl ifconfig.me
```

**Запишите этот IP адрес!** (например: `185.123.45.67`)

### 1.2. Настройте DNS записи в панели регистратора домена:

1. Войдите в панель управления доменом (где регистрировали)
2. Найдите раздел **"DNS"** или **"Управление DNS"**
3. Добавьте/измените **A-записи**:

   | Тип | Имя | Значение | TTL |
   |-----|-----|----------|-----|
   | A   | @   | `ваш-ip-адрес` | 3600 |
   | A   | www | `ваш-ip-адрес` | 3600 |

4. **Сохраните изменения**
5. **Подождите 5-30 минут** (распространение DNS)

### 1.3. Проверьте DNS:

```bash
dig profitech.store +short
# Должен вернуться ваш IP адрес
```

**✅ Только после того, как DNS настроен, продолжайте дальше!**

---

## 🖥️ ШАГ 2: Подключение к серверу

```bash
ssh root@ваш-ip-адрес
# или
ssh ваш-пользователь@ваш-ip-адрес
```

---

## 🔧 ШАГ 3: Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential
```

---

## 📦 ШАГ 4: Установка Node.js 20

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

---

## 🗄️ ШАГ 5: Установка MongoDB

```bash
# Определите версию Ubuntu
lsb_release -a

# Импортируйте ключ MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Добавьте репозиторий (замените jammy на вашу версию: focal/jammy/noble)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Обновите и установите
sudo apt update
sudo apt install -y mongodb-org

# Запустите MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Проверьте статус
sudo systemctl status mongod
```

### 5.1. Создайте пользователя MongoDB:

```bash
# Подключитесь к MongoDB
mongosh

# В консоли MongoDB выполните:
use admin
db.createUser({
  user: "admin_db",
  pwd: "admin_db",
  roles: [
    { role: "readWrite", db: "profitech_db" },
    { role: "dbAdmin", db: "profitech_db" }
  ]
})
exit
```

### 5.2. Включите аутентификацию:

```bash
# Отредактируйте конфигурацию
sudo nano /etc/mongod.conf
```

Добавьте в конец файла:
```yaml
security:
  authorization: enabled
```

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
# Перезапустите MongoDB
sudo systemctl restart mongod

# Проверьте подключение
mongosh -u admin_db -p admin_db --authenticationDatabase admin profitech_db
```

---

## 🌐 ШАГ 6: Установка Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

---

## 👤 ШАГ 7: Создание пользователя для приложения

```bash
sudo adduser --disabled-password --gecos "" profitech
sudo usermod -aG sudo profitech
su - profitech
```

---

## 📥 ШАГ 8: Клонирование проекта

```bash
cd ~
git clone https://github.com/FlooooowY/ProfiTech-Site.git
cd ProfiTech-Site
```

---

## ⚙️ ШАГ 9: Настройка переменных окружения

```bash
# Скопируйте шаблон
cp env.template .env.local

# Отредактируйте файл
nano .env.local
```

Убедитесь, что файл содержит:
```env
MONGODB_URI=mongodb://admin_db:admin_db@localhost:27017/profitech_db?authSource=admin
DB_HOST=localhost
DB_USER=admin_db
DB_PASSWORD=admin_db
DB_NAME=profitech_db
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://profitech.store
```

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## 📚 ШАГ 10: Установка зависимостей

```bash
# Убедитесь, что используете Node.js 20
node --version  # Должно быть v20.x.x
nvm use 20

# Очистите кэш npm
npm cache clean --force

# Установите зависимости
NODE_OPTIONS="--max-old-space-size=4096" npm install
```

**⏳ Это может занять 5-10 минут...**

---

## 🏗️ ШАГ 11: Сборка проекта

```bash
npm run build
```

**⏳ Это может занять 3-5 минут...**

**Ожидаемый результат:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

---

## 🚀 ШАГ 12: Установка PM2 (менеджер процессов)

```bash
# Установите PM2 глобально
sudo npm install -g pm2

# Запустите приложение через PM2
pm2 start npm --name "profitech" -- start

# Сохраните конфигурацию
pm2 save

# Настройте автозапуск
pm2 startup
# ⚠️ ВАЖНО: Выполните команду, которую выдаст PM2 (обычно что-то вроде: sudo env PATH=...)

# Проверьте статус
pm2 status
pm2 logs profitech
```

---

## 🔧 ШАГ 13: Настройка Nginx

```bash
# Создайте конфигурацию для вашего сайта
sudo nano /etc/nginx/sites-available/profitech.store
```

**Вставьте следующую конфигурацию** (замените `profitech.store` на ваш домен):

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

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
# Активируйте конфигурацию
sudo ln -s /etc/nginx/sites-available/profitech.store /etc/nginx/sites-enabled/

# Проверьте конфигурацию
sudo nginx -t

# Перезагрузите Nginx
sudo systemctl reload nginx
```

---

## 🔒 ШАГ 14: Настройка SSL (Let's Encrypt)

**⚠️ ВАЖНО:** Убедитесь, что:
1. Домен указывает на IP вашего VPS (DNS настроен)
2. Порты 80 и 443 открыты в файрволе
3. Nginx запущен

```bash
# Установите Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получите SSL сертификат
sudo certbot --nginx -d profitech.store -d www.profitech.store
```

**Certbot автоматически:**
- Получит сертификат
- Обновит конфигурацию Nginx
- Настроит редирект с HTTP на HTTPS

**Проверьте автопродление:**
```bash
sudo certbot renew --dry-run
```

---

## 🔥 ШАГ 15: Настройка файрвола

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

## 📦 ШАГ 16: Загрузка каталога товаров

1. **Откройте админ-панель в браузере:**
   ```
   https://profitech.store/admin
   ```

2. **Войдите** (если требуется)

3. **Нажмите "Запустить импорт каталога"**

4. **Дождитесь завершения импорта** (это может занять несколько минут)

5. **Проверьте, что файл создан:**
   ```bash
   ls -la ~/ProfiTech-Site/public/data/products.json
   ```

---

## ✅ ШАГ 17: Проверка работы

1. **Откройте сайт:** `https://profitech.store`
2. **Проверьте каталог:** `https://profitech.store/catalog` - товары должны отображаться
3. **Проверьте фильтрацию:** выберите категорию, производителя
4. **Проверьте поиск:** введите название товара в поиск

---

## 🛠️ Полезные команды

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

### Обновление кода:

```bash
cd ~/ProfiTech-Site
git pull
npm install
npm run build
pm2 restart profitech
```

### Управление MongoDB:

```bash
# Войти в MongoDB
mongosh -u admin_db -p admin_db --authenticationDatabase admin profitech_db

# Проверить количество товаров
mongosh -u admin_db -p admin_db --authenticationDatabase admin profitech_db --eval "db.products.countDocuments()"
```

### Управление Nginx:

```bash
# Проверить конфигурацию
sudo nginx -t

# Перезагрузить Nginx
sudo systemctl reload nginx

# Логи Nginx
sudo tail -f /var/log/nginx/profitech-error.log
```

---

## ❗ Решение проблем

### Приложение не запускается:

```bash
# Проверьте логи
pm2 logs profitech --lines 50

# Проверьте версию Node.js
node --version  # Должно быть v20.x.x

# Проверьте порт 3000
sudo netstat -tulpn | grep 3000
```

### Ошибка подключения к БД:

```bash
# Проверьте, что MongoDB запущен
sudo systemctl status mongod

# Проверьте подключение
mongosh -u admin_db -p admin_db --authenticationDatabase admin profitech_db

# Проверьте .env.local
cat ~/ProfiTech-Site/.env.local
```

### Nginx не работает:

```bash
# Проверьте конфигурацию
sudo nginx -t

# Проверьте логи
sudo tail -f /var/log/nginx/error.log

# Проверьте статус
sudo systemctl status nginx
```

### Сайт показывает ошибку:

1. Проверьте логи: `pm2 logs profitech`
2. Проверьте подключение к БД
3. Проверьте, что товары загружены
4. Перезапустите приложение: `pm2 restart profitech`

---

## 🎉 Готово!

Ваш сайт должен быть доступен по адресу `https://profitech.store`

**Если что-то не работает:**
1. Проверьте логи: `pm2 logs profitech`
2. Проверьте статус всех сервисов: `pm2 status`, `sudo systemctl status mongod`, `sudo systemctl status nginx`
3. Проверьте файрвол: `sudo ufw status`
4. Проверьте DNS: `dig profitech.store +short`

---

**Удачи с установкой! 🚀**

