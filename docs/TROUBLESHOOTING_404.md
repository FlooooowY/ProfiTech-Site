# Решение проблемы "Страница не найдена" (404)

## Быстрая диагностика

Выполните на сервере:

```bash
cd ~/ProfiTech-Site
chmod +x scripts/check-site.sh
npm run site:check
```

Этот скрипт проверит:
- ✅ Запущено ли приложение в PM2
- ✅ Работает ли порт 3000
- ✅ Доступен ли localhost:3000
- ✅ Запущен ли Nginx
- ✅ Правильно ли настроено проксирование

## Частые причины и решения

### 1. Приложение не запущено

**Симптомы:**
- Сайт не открывается
- Порт 3000 не прослушивается

**Решение:**
```bash
cd ~/ProfiTech-Site
pm2 restart profitech
# Или если приложение не добавлено в PM2:
pm2 start npm --name profitech -- start
```

### 2. Nginx не запущен или неправильно настроен

**Симптомы:**
- Домен не открывается
- Ошибки в логах Nginx

**Решение:**
```bash
# Проверка статуса
sudo systemctl status nginx

# Запуск Nginx
sudo systemctl start nginx

# Проверка конфигурации
sudo nginx -t

# Перезагрузка конфигурации
sudo systemctl reload nginx
```

### 3. Проблемы с кэшем браузера

**Симптомы:**
- Ошибки "Failed to find Server Action"
- Старая версия сайта отображается

**Решение:**
- Очистите кэш браузера (Ctrl+Shift+Delete)
- Откройте сайт в режиме инкогнито
- Или выполните жесткую перезагрузку (Ctrl+F5)

### 4. Проблемы с роутингом Next.js

**Симптомы:**
- Страница не найдена на всех маршрутах
- Ошибки в логах приложения

**Решение:**
```bash
cd ~/ProfiTech-Site

# Пересоберите приложение
npm run build

# Перезапустите
pm2 restart profitech
```

### 5. Проблемы с переменными окружения

**Симптомы:**
- Приложение запускается, но не работает
- Ошибки подключения к базе данных

**Решение:**
```bash
# Проверьте наличие .env.local
ls -la ~/ProfiTech-Site/.env.local

# Проверьте содержимое (не показывайте пароли!)
cat ~/ProfiTech-Site/.env.local | grep -v PASSWORD
```

## Пошаговая диагностика

### Шаг 1: Проверка приложения

```bash
# Проверьте статус PM2
pm2 list

# Проверьте логи
pm2 logs profitech --lines 50

# Проверьте, что приложение отвечает
curl http://localhost:3000
```

**Ожидаемый результат:** HTTP 200 или редирект

### Шаг 2: Проверка Nginx

```bash
# Проверьте статус
sudo systemctl status nginx

# Проверьте конфигурацию
sudo nginx -t

# Проверьте логи ошибок
sudo tail -f /var/log/nginx/error.log
```

### Шаг 3: Проверка проксирования

```bash
# Проверьте конфигурацию Nginx
sudo cat /etc/nginx/sites-available/profitech | grep proxy_pass

# Должно быть:
# proxy_pass http://localhost:3000;
```

### Шаг 4: Проверка домена

```bash
# Проверьте DNS
nslookup profitech.store

# Проверьте доступность
curl -I http://profitech.store
```

## Ошибки "Failed to find Server Action"

Эти ошибки обычно **не критичны** и возникают из-за:

1. **Кэша браузера** - старая версия клиента пытается использовать новые Server Actions
2. **Старых запросов** - запросы от предыдущей версии приложения

**Решение:**
- Очистите кэш браузера
- Перезагрузите страницу (Ctrl+F5)
- Ошибки исчезнут после того, как все клиенты обновятся

Если ошибки продолжаются, перезапустите приложение:

```bash
pm2 restart profitech
```

## Полная перезагрузка системы

Если ничего не помогает:

```bash
cd ~/ProfiTech-Site

# 1. Остановите приложение
pm2 stop profitech

# 2. Обновите код
git pull

# 3. Установите зависимости (если нужно)
npm install

# 4. Пересоберите
npm run build

# 5. Перезапустите
pm2 restart profitech

# 6. Проверьте логи
pm2 logs profitech --lines 20

# 7. Перезагрузите Nginx
sudo systemctl reload nginx
```

## Проверка работы сайта

После всех действий проверьте:

```bash
# Локально
curl http://localhost:3000

# Через домен
curl http://profitech.store
```

Оба должны возвращать HTML код страницы.

## Получение помощи

Если проблема сохраняется:

1. Соберите логи:
   ```bash
   pm2 logs profitech --lines 100 > app-logs.txt
   sudo tail -100 /var/log/nginx/error.log > nginx-logs.txt
   ```

2. Проверьте статус всех сервисов:
   ```bash
   npm run site:check
   ```

3. Проверьте конфигурацию Nginx:
   ```bash
   sudo nginx -t
   sudo cat /etc/nginx/sites-available/profitech
   ```

