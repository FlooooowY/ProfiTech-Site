# Инструкция по деплою на хостинг ISPmanager

## Подготовка

### 1. Требования
- Хостинг с поддержкой Node.js (версия 18+)
- MySQL база данных
- Доступ к ISPmanager панели
- SSH доступ (опционально, но рекомендуется)

---

## Шаг 1: Подключение к хостингу

### Через ISPmanager:
1. Войдите в панель ISPmanager
2. Перейдите в раздел **"Файлы"** или **"File Manager"**
3. Найдите папку для вашего домена (обычно `domains/profitech.store/public_html`)

### Через SSH (рекомендуется):
```bash
ssh ваш-пользователь@ваш-хостинг.ru
cd domains/profitech.store/public_html
```

---

## Шаг 2: Загрузка проекта

### Вариант A: Через Git (рекомендуется)

1. **Клонируйте репозиторий:**
```bash
cd domains/profitech.store/public_html
git clone https://github.com/FlooooowY/ProfiTech-Site.git .
```

2. **Или если папка уже существует:**
```bash
cd domains/profitech.store/public_html
git pull origin main
```

### Вариант B: Через FTP/SFTP

1. Загрузите все файлы проекта в папку `public_html`
2. Убедитесь, что структура папок сохранена

---

## Шаг 3: Проверка версии Node.js

**Важно:** Next.js 16 требует Node.js версии 18.17 или выше.

### Проверьте версию Node.js:
```bash
node --version
```

**Если версия меньше 18.17**, нужно обновить Node.js:

### Вариант A: Через ISPmanager
1. Перейдите в раздел **"Настройки"** → **"Node.js"**
2. Выберите версию **18.x** или **20.x** (рекомендуется 20.x)
3. Примените изменения

### Вариант B: Установка NVM и Node.js 20

Если NVM не установлен, установите его:

```bash
# Установите NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Перезагрузите терминал или выполните:
source ~/.bashrc

# Проверьте, что NVM установлен
nvm --version

# Установите Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Проверьте версию
node --version
```

**Если установка NVM не работает** (нет прав или curl недоступен), используйте Вариант A через ISPmanager.

### Вариант C: Если нет доступа к обновлению
Обратитесь в поддержку хостинга с запросом обновить Node.js до версии 18+ или 20+.

---

## Шаг 4: Установка зависимостей

**Важно:** Для сборки Next.js нужны devDependencies (TypeScript и др.), поэтому используем полную установку, но с увеличенным лимитом памяти.

### Через SSH:

**Если на сервере мало памяти, используйте установку по частям:**

```bash
cd domains/profitech.store/public_html

# Вариант 1: Установка с минимальным потреблением памяти
NODE_OPTIONS="--max-old-space-size=1024" npm install --legacy-peer-deps --no-optional --prefer-offline

# Вариант 2: Если не работает, установите по частям
# Сначала основные зависимости
NODE_OPTIONS="--max-old-space-size=1024" npm install --save next react react-dom mysql2 zustand framer-motion lucide-react react-icons papaparse csv-parse @tanstack/react-query

# Затем TypeScript и типы (нужны для сборки)
NODE_OPTIONS="--max-old-space-size=1024" npm install --save-dev typescript @types/node @types/react @types/react-dom @types/papaparse

# Затем остальные devDependencies
NODE_OPTIONS="--max-old-space-size=1024" npm install --save-dev eslint eslint-config-next tailwindcss @tailwindcss/postcss tsx

# Вариант 3: Если есть возможность, создайте swap файл (см. раздел "Решение проблем")
```

### Через ISPmanager:
1. Откройте терминал в панели ISPmanager
2. Перейдите в папку проекта
3. Выполните: `NODE_OPTIONS="--max-old-space-size=4096" npm install`

**Примечание:** Если все равно не хватает памяти, см. раздел "Решение проблем" → "Нехватка памяти при установке зависимостей"

---

## Шаг 5: Настройка переменных окружения

### Готовый файл уже создан!

В проекте есть файл `env.template` с готовыми настройками. Просто скопируйте его:

### Через SSH:
```bash
cd domains/profitech.store/public_html
cp env.template .env.local
```

Готово! Файл уже настроен с правильным доменом profitech.store.

### Через ISPmanager:
1. В файловом менеджере найдите файл `env.template`
2. Скопируйте его и переименуйте в `.env.local`
3. Готово! Файл уже содержит все нужные настройки

**Важно:** 
- Файл `.env.local` уже содержит все нужные настройки БД и домен profitech.store
- Ничего редактировать не нужно!

---

## Шаг 6: Настройка базы данных MySQL

### В ISPmanager:

1. **Создайте базу данных** (если еще не создана):
   - Перейдите в раздел **"Базы данных"** → **"MySQL"**
   - Создайте базу данных `u3364352_default`
   - Создайте пользователя `u3364352_default` с паролем `nDpDE4luD7G84uk3!@#`
   - Назначьте пользователю все права на базу данных

2. **Проверьте подключение:**
   - Убедитесь, что хост: `localhost`
   - Пользователь: `u3364352_default`
   - Пароль: `nDpDE4luD7G84uk3!@#`
   - База данных: `u3364352_default`

---

## Шаг 7: Создание таблиц в базе данных

### Через SSH (рекомендуется):

```bash
cd domains/profitech.store/public_html
npm run db:create
```

### Через ISPmanager терминал:

1. Откройте терминал в панели
2. Перейдите в папку проекта
3. Выполните: `npm run db:create`

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

## Шаг 8: Импорт категорий и подкатегорий

```bash
npm run db:import-categories
```

**Ожидаемый результат:**
```
✓ Imported X categories
✓ Imported Y subcategories
✅ All categories and subcategories imported successfully!
```

---

## Шаг 9: Сборка проекта

```bash
npm run build
```

**Важно:** Это создаст оптимизированную production версию сайта.

**Ожидаемый результат:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

---

## Шаг 10: Настройка Node.js приложения в ISPmanager

### В панели ISPmanager:

1. **Перейдите в раздел "WWW"** или **"Веб-серверы"**
2. **Найдите ваш домен** и откройте настройки
3. **Настройте Node.js:**
   - Включите поддержку Node.js
   - Укажите версию Node.js (18 или выше)
   - **Путь к приложению:** `domains/profitech.store/public_html`
   - **Команда запуска:** `npm start`
   - **Рабочая директория:** `domains/profitech.store/public_html`

4. **Настройте домен:**
   - Убедитесь, что домен указывает на правильную папку
   - Включите SSL сертификат (Let's Encrypt)

---

## Шаг 11: Запуск приложения

### Через ISPmanager:

1. **Перезапустите Node.js приложение:**
   - В разделе "WWW" найдите ваше приложение
   - Нажмите "Перезапустить" или "Restart"

2. **Проверьте логи:**
   - Откройте логи приложения
   - Убедитесь, что нет ошибок

### Через SSH:

```bash
# Если используется PM2 или другой процесс-менеджер
pm2 start npm --name "profitech" -- start

# Или просто
npm start
```

---

## Шаг 13: Загрузка каталога товаров через админ-панель

**Важно:** Сначала нужно запустить сайт и загрузить каталог через админ-панель, чтобы создать файл `public/data/products.json`.

1. **Откройте админ-панель:** `https://profitech.store/admin`
2. **Нажмите "Запустить импорт каталога"**
3. **Дождитесь завершения импорта** (это может занять несколько минут)
4. **Проверьте, что файл создан:** `public/data/products.json` должен появиться

---

## Шаг 14: Импорт товаров в MySQL

После того, как каталог загружен через админ-панель и файл `public/data/products.json` создан:

```bash
cd domains/profitech.store/public_html
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

**Важно:** 
- Этот шаг нужно выполнять **после** загрузки каталога через `/admin`
- Импорт может занять несколько минут для большого количества товаров

---

## Шаг 15: Проверка работы

1. **Откройте сайт:** `https://profitech.store`
2. **Проверьте каталог:** `https://profitech.store/catalog` - товары должны отображаться
3. **Проверьте фильтрацию:** попробуйте выбрать категорию, производителя
4. **Проверьте поиск:** введите название товара в поиск
5. **Проверьте API:**
   - `https://profitech.store/api/catalog?page=1&limit=24`
   - `https://profitech.store/api/catalog/stats`

---

## Шаг 16: Настройка автоматического запуска (опционально)

### Если используется PM2:

```bash
# Установите PM2 глобально
npm install -g pm2

# Запустите приложение
pm2 start npm --name "profitech" -- start

# Сохраните конфигурацию для автозапуска
pm2 save
pm2 startup
```

---

## Обновление сайта

### Когда нужно обновить код:

```bash
cd domains/profitech.store/public_html
git pull origin main
npm install --production
npm run build
# Перезапустите приложение через ISPmanager
```

### Когда нужно обновить товары:

1. Откройте `/admin` на сайте
2. Запустите импорт
3. Выполните: `npm run db:import-products`

---

## Решение проблем

### Ошибка "SyntaxError: Unexpected token ?" при сборке:

**Причина:** На хостинге установлена старая версия Node.js (меньше 18.17).

**Решение:**
1. Проверьте версию: `node --version`
2. Если версия меньше 18.17:
   - **Через ISPmanager:** Обновите Node.js в разделе "Настройки" → "Node.js" до версии 18+ или 20+
   - **Через NVM:** Используйте `nvm install 20 && nvm use 20`
   - **Обратитесь в поддержку хостинга** с запросом обновить Node.js

3. После обновления перезапустите терминал и проверьте версию снова
4. Повторите сборку: `npm run build`

### Ошибка подключения к БД:

1. Проверьте `.env.local` файл
2. Убедитесь, что данные БД правильные
3. Проверьте, что MySQL сервер запущен
4. Проверьте права пользователя БД

### Ошибка при сборке:

1. Убедитесь, что Node.js версия 18+
2. Проверьте, что все зависимости установлены: `npm install`
3. Проверьте логи сборки

### Медленная работа:

1. Убедитесь, что индексы созданы: `npm run db:create`
2. Проверьте, что товары импортированы
3. Очистите кэш Next.js: удалите папку `.next`

### Товары не отображаются:

1. Проверьте, что товары импортированы: `npm run db:import-products`
2. Проверьте API: `https://profitech.store/api/catalog`
3. Проверьте логи приложения

---

## Структура файлов на хостинге

```
domains/profitech.store/public_html/
├── .env.local                    # Переменные окружения (ВАЖНО!)
├── .next/                        # Собранное приложение (создается после build)
├── app/                          # Next.js страницы
├── components/                   # React компоненты
├── lib/                          # Утилиты (включая db.ts)
├── scripts/                      # Скрипты для БД
├── public/                       # Статические файлы
│   └── data/
│       └── products.json        # Файл с товарами (для импорта)
├── package.json
└── node_modules/                # Зависимости
```

---

## Контакты и поддержка

Если возникли проблемы:
1. Проверьте логи в ISPmanager
2. Проверьте логи Node.js приложения
3. Убедитесь, что все шаги выполнены правильно

---

## Быстрая шпаргалка команд

```bash
# Установка зависимостей
npm install --production

# Создание таблиц БД
npm run db:create

# Импорт категорий
npm run db:import-categories

# Импорт товаров
npm run db:import-products

# Сборка проекта
npm run build

# Запуск (в production)
npm start

# Обновление кода
git pull origin main && npm install --production && npm run build
```

---

**Готово!** Ваш сайт должен работать на хостинге с оптимизированной MySQL базой данных.

