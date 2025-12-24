# Настройка домена для сайта

## Важно

**Домен настраивается через Nginx (reverse proxy), а не через npm!**

Nginx работает как посредник между интернетом и вашим Next.js приложением:
- Пользователь → `profitech.store` → Nginx (порт 80) → Next.js (порт 3000)

## Быстрая проверка

```bash
npm run domain:check
```

Этот скрипт проверит:
- ✅ Настроен ли DNS
- ✅ Настроен ли Nginx
- ✅ Доступен ли домен
- ✅ Работает ли приложение

## Пошаговая настройка

### 1. Настройка DNS

В панели управления доменом (где вы покупали домен) добавьте A-записи:

```
A запись:
  Имя: @ (или profitech.store)
  Значение: 82.26.91.241 (IP вашего сервера)
  TTL: 3600

A запись:
  Имя: www
  Значение: 82.26.91.241 (IP вашего сервера)
  TTL: 3600
```

**Важно:** Замените `82.26.91.241` на IP вашего сервера!

### 2. Проверка DNS

После добавления записей подождите 5-15 минут и проверьте:

```bash
# Узнайте IP вашего сервера
curl ifconfig.me

# Проверьте DNS
nslookup profitech.store
nslookup www.profitech.store
```

IP в ответе должен совпадать с IP вашего сервера.

### 3. Настройка Nginx

Nginx уже должен быть настроен. Проверьте:

```bash
# Проверьте конфигурацию
sudo cat /etc/nginx/sites-available/profitech

# Проверьте синтаксис
sudo nginx -t

# Перезагрузите Nginx
sudo systemctl reload nginx
```

Если конфигурации нет, создайте её:

```bash
sudo nano /etc/nginx/sites-available/profitech
```

Скопируйте конфигурацию из `docs/NGINX_CONFIG.md`, замените `profitech.store` на ваш домен.

Затем активируйте:

```bash
sudo ln -s /etc/nginx/sites-available/profitech /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Проверка работы

```bash
# Проверьте локально
curl http://localhost:3000

# Проверьте через домен
curl http://profitech.store
```

Оба должны возвращать HTML код страницы.

## Переменные окружения (опционально)

Если нужно указать домен в коде, добавьте в `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=https://profitech.store
NEXT_PUBLIC_DOMAIN=profitech.store
```

Затем используйте в коде:

```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://profitech.store';
```

## Частые проблемы

### Домен не открывается

1. **Проверьте DNS:**
   ```bash
   nslookup profitech.store
   ```
   IP должен совпадать с IP сервера.

2. **Проверьте Nginx:**
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

3. **Проверьте приложение:**
   ```bash
   pm2 list
   curl http://localhost:3000
   ```

### Домен открывается, но показывает 404

Это проблема с Next.js роутингом, не с доменом. Проверьте:
- Запущено ли приложение: `pm2 list`
- Пересоберите приложение: `npm run build`
- Перезапустите: `pm2 restart profitech`

### Домен открывается, но показывает старую версию

Очистите кэш:
```bash
# Очистите кэш Next.js
rm -rf .next

# Пересоберите
npm run build

# Перезапустите
pm2 restart profitech
```

## SSL/HTTPS (после настройки домена)

После того, как домен работает по HTTP, можно настроить HTTPS:

```bash
sudo certbot --nginx -d profitech.store -d www.profitech.store
```

**Важно:** Убедитесь, что домен работает по HTTP перед настройкой SSL!

## Автоматическая проверка

Добавьте в cron для регулярной проверки:

```bash
# Проверка каждые 5 минут
*/5 * * * * cd /home/profitech/ProfiTech-Site && npm run domain:check >> /var/log/domain-check.log 2>&1
```

