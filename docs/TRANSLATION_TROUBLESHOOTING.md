# Решение проблем с переводом товаров

## Ошибка: "fetch failed" и "MongoNetworkError"

Если при запуске `npm run db:translate-products-fast` вы видите ошибки:
- `⚠️ Ошибка перевода: fetch failed`
- `❌ Ошибка: MongoNetworkError: connect ETIMEDOUT 127.0.0.1:27017`

Это означает, что **MongoDB** или **LibreTranslate** не запущены.

## Быстрое решение

### 1. Проверьте статус сервисов

```bash
npm run services:check
```

Этот скрипт покажет:
- ✅ Запущен ли MongoDB
- ✅ Запущен ли Docker
- ✅ Запущен ли LibreTranslate
- ⚠️ Что нужно исправить

### 2. Автоматический запуск сервисов

```bash
npm run services:start
```

Этот скрипт автоматически:
- Запустит MongoDB (если установлен)
- Запустит Docker daemon (если установлен)
- Создаст и запустит контейнер LibreTranslate

### 3. Запустите перевод

После того, как все сервисы запущены:

```bash
npm run db:translate-products-fast
```

## Ручное решение

### MongoDB не запущен

```bash
# Проверка статуса
sudo systemctl status mongod

# Запуск MongoDB
sudo systemctl start mongod

# Автозапуск при перезагрузке
sudo systemctl enable mongod
```

Если MongoDB не установлен:

```bash
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongod
sudo systemctl enable mongod
```

### LibreTranslate не запущен

```bash
# Проверка, запущен ли контейнер
docker ps | grep libretranslate

# Если контейнер существует, но не запущен
docker start libretranslate

# Если контейнера нет, создайте его
docker run -d -p 5000:5000 --name libretranslate libretranslate/libretranslate

# Проверка логов (если есть проблемы)
docker logs libretranslate
```

Если Docker не установлен:

```bash
# Установка Docker
chmod +x scripts/install-docker.sh
./scripts/install-docker.sh

# После установки перелогиньтесь или выполните:
newgrp docker

# Затем создайте контейнер LibreTranslate
docker run -d -p 5000:5000 --name libretranslate libretranslate/libretranslate
```

## Проверка подключения

### Проверка MongoDB

```bash
# Проверка через mongosh
mongosh --eval "db.adminCommand('ping')"

# Или через Node.js скрипт
npm run db:check
```

### Проверка LibreTranslate

```bash
# Проверка API
curl http://localhost:5000/languages

# Должен вернуть JSON с языками
```

## Частые проблемы

### 1. "Permission denied" при запуске MongoDB

```bash
# Убедитесь, что вы используете sudo
sudo systemctl start mongod

# Или проверьте права на директорию данных
sudo chown -R mongodb:mongodb /var/lib/mongodb
```

### 2. Docker требует sudo

```bash
# Добавьте пользователя в группу docker
sudo usermod -aG docker $USER

# Перелогиньтесь или выполните:
newgrp docker
```

### 3. LibreTranslate не отвечает

```bash
# Проверьте логи
docker logs libretranslate

# Перезапустите контейнер
docker restart libretranslate

# Если не помогает, удалите и создайте заново
docker stop libretranslate
docker rm libretranslate
docker run -d -p 5000:5000 --name libretranslate libretranslate/libretranslate
```

### 4. MongoDB не подключается

Проверьте настройки в `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/profitech_db
# Или с аутентификацией:
MONGODB_URI=mongodb://username:password@localhost:27017/profitech_db?authSource=admin
```

## После успешного запуска

Когда все сервисы запущены, вы должны увидеть:

```
✅ MongoDB запущен
✅ Docker daemon запущен
✅ LibreTranslate запущен
✅ LibreTranslate API доступен на http://localhost:5000
```

Теперь можно запускать перевод:

```bash
npm run db:translate-products-fast
```

## Мониторинг прогресса

Скрипт перевода показывает прогресс каждые 100 товаров:

```
📊 Прогресс: 45.2% (45200/100000) | Обновлено: 45000 | Кэш: 12000 | Ошибок: 5
```

Если видите много ошибок "fetch failed", проверьте, что LibreTranslate все еще запущен:

```bash
docker ps | grep libretranslate
```

Если контейнер остановился, перезапустите его:

```bash
docker start libretranslate
```

