# Настройка переменных окружения

## Локальная разработка

Создайте файл `.env.local` в корне проекта и добавьте следующие переменные:

```env
# OpenRouter API Key для AI ассистента
OPENROUTER_API_KEY=sk-or-v1-ваш-ключ-здесь

# MongoDB Connection
MONGODB_URI=mongodb://admin_db:admin_db@localhost:27017/profitech_db?authSource=admin
DB_NAME=profitech_db
DB_HOST=localhost
DB_USER=admin_db
DB_PASSWORD=admin_db

# Admin Panel
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password

# Site URL (для OpenRouter headers)
NEXT_PUBLIC_SITE_URL=https://profitech.store
```

## Настройка на сервере

### 1. Создайте файл `.env.local` на сервере:

```bash
cd ~/ProfiTech-Site
nano .env.local
```

### 2. Добавьте все переменные окружения:

```env
OPENROUTER_API_KEY=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
MONGODB_URI=mongodb://admin_db:admin_db@localhost:27017/profitech_db?authSource=admin
DB_NAME=profitech_db
DB_HOST=localhost
DB_USER=admin_db
DB_PASSWORD=admin_db
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ваш-пароль-админа
NEXT_PUBLIC_SITE_URL=https://profitech.store
```

### 3. Установите правильные права доступа:

```bash
chmod 600 .env.local
```

### 4. Перезапустите приложение:

```bash
pm2 restart all
```

## Важно!

- ⚠️ **НИКОГДА** не коммитьте `.env.local` в Git
- ⚠️ Файл `.env.local` уже добавлен в `.gitignore`
- ⚠️ Используйте разные пароли для продакшена
- ⚠️ Регулярно обновляйте API ключи

## Проверка переменных окружения

После настройки проверьте, что переменные загружены:

```bash
# На сервере через PM2
pm2 env 0 | grep OPENROUTER_API_KEY
```

Если переменные не загружаются, используйте:

```bash
pm2 restart all --update-env
```

