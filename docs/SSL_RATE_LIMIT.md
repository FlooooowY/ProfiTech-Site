# Решение проблемы с лимитом запросов Let's Encrypt

## Проблема
```
too many failed authorizations (5) for "profitech.store" in the last 1h0m0s
```

Let's Encrypt ограничил количество попыток из-за слишком многих неудачных авторизаций.

## Решения

### Вариант 1: Подождать (рекомендуется)

Лимит сбрасывается через 1 час после последней неудачной попытки.

```bash
# Проверьте, когда можно попробовать снова
# В сообщении указано: retry after 2025-12-24 10:03:34 UTC

# Подождите до указанного времени, затем:
sudo certbot --nginx -d profitech.store -d www.profitech.store
```

### Вариант 2: Использовать webroot метод (может обойти лимит)

```bash
# 1. Убедитесь, что директория существует
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# 2. Получите сертификат через webroot
sudo certbot certonly --webroot \
    -w /var/www/html \
    -d profitech.store \
    -d www.profitech.store \
    --email admin@profitech.store \
    --agree-tos \
    --non-interactive

# 3. После получения сертификата настройте Nginx
sudo certbot --nginx -d profitech.store -d www.profitech.store
```

### Вариант 3: Использовать staging окружение для тестирования

```bash
# Получите тестовый сертификат (не ограничен лимитами)
sudo certbot --nginx -d profitech.store -d www.profitech.store \
    --staging \
    --email admin@profitech.store \
    --agree-tos \
    --non-interactive

# После успешного теста удалите staging сертификат и получите реальный
sudo certbot delete --cert-name profitech.store
sudo certbot --nginx -d profitech.store -d www.profitech.store
```

### Вариант 4: Использовать другой email/аккаунт

```bash
# Используйте другой email для создания нового аккаунта
sudo certbot --nginx -d profitech.store -d www.profitech.store \
    --email другой-email@example.com \
    --agree-tos \
    --non-interactive
```

## Что делать сейчас

1. **Убедитесь, что конфигурация правильная:**
   ```bash
   ./scripts/fix-nginx-complete.sh
   ```

2. **Проверьте доступность ACME challenge:**
   ```bash
   curl -I http://profitech.store/.well-known/acme-challenge/test
   # Должен вернуть 404 (это нормально для тестового файла)
   ```

3. **Подождите до указанного времени** (10:03:34 UTC в вашем случае)

4. **Попробуйте снова:**
   ```bash
   sudo certbot --nginx -d profitech.store -d www.profitech.store
   ```

## Предотвращение проблемы в будущем

- Убедитесь, что конфигурация Nginx правильная ПЕРЕД запуском Certbot
- Используйте `--dry-run` для тестирования:
  ```bash
  sudo certbot --nginx -d profitech.store -d www.profitech.store --dry-run
  ```
- Проверяйте доступность ACME challenge перед получением сертификата

## Лимиты Let's Encrypt

- **5 неудачных авторизаций** на домен в час
- **50 сертификатов** на домен в неделю
- **5 дубликатов** сертификата в неделю

Подробнее: https://letsencrypt.org/docs/rate-limits/

