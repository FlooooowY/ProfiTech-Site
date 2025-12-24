# Решение проблем с SSL сертификатом (Let's Encrypt)

## Проблема: Certbot не может проверить домен (404 ошибка)

### Причины:
1. DNS не настроен или не обновился
2. Домен не указывает на ваш сервер
3. Порт 80 закрыт в файрволе
4. Nginx не настроен правильно

## Диагностика

### Шаг 1: Проверьте DNS

```bash
# Проверьте, что домен указывает на ваш IP
nslookup profitech.store
nslookup www.profitech.store

# Должен показать IP вашего сервера
```

### Шаг 2: Проверьте доступность домена

```bash
# С вашего компьютера (не с сервера!)
curl -I http://profitech.store
curl -I http://www.profitech.store

# Должен вернуть HTTP 200 или 301/302
```

### Шаг 3: Проверьте файрвол

```bash
# Проверьте статус файрвола
sudo ufw status

# Убедитесь, что порты 80 и 443 открыты
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

### Шаг 4: Проверьте конфигурацию Nginx

```bash
# Проверьте, что Nginx слушает порт 80
sudo netstat -tulpn | grep :80

# Проверьте конфигурацию
sudo nginx -t

# Проверьте логи
sudo tail -f /var/log/nginx/error.log
```

## Решение

### Вариант 1: Исправьте конфигурацию Nginx для ACME challenge

Убедитесь, что в `/etc/nginx/sites-available/profitech` есть блок для обработки ACME challenge:

```nginx
server {
    listen 80;
    server_name profitech.store www.profitech.store;
    
    # Для Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }
    
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

Создайте директорию для ACME challenge:

```bash
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

### Вариант 2: Используйте standalone режим (если Nginx не работает)

```bash
# Остановите Nginx временно
sudo systemctl stop nginx

# Получите сертификат в standalone режиме
sudo certbot certonly --standalone -d profitech.store -d www.profitech.store

# Запустите Nginx обратно
sudo systemctl start nginx

# Настройте Nginx для использования сертификата
sudo certbot --nginx -d profitech.store -d www.profitech.store
```

### Вариант 3: Проверьте, что домен доступен извне

```bash
# С сервера проверьте, что домен резолвится
curl -I http://profitech.store

# Если получаете ошибку, проверьте DNS настройки у регистратора домена
```

## Полная инструкция по настройке SSL

### 1. Обновите конфигурацию Nginx

```bash
sudo nano /etc/nginx/sites-available/profitech
```

Добавьте блок для ACME challenge (см. Вариант 1 выше).

### 2. Перезагрузите Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Проверьте доступность

```bash
# Проверьте, что домен доступен
curl http://profitech.store/.well-known/acme-challenge/test

# Должен вернуть 404 (это нормально, главное что не connection refused)
```

### 4. Получите сертификат

```bash
sudo certbot --nginx -d profitech.store -d www.profitech.store
```

### 5. Проверьте автоматическое обновление

```bash
sudo certbot renew --dry-run
```

## Частые проблемы

### Проблема: "Connection refused"

**Решение:** 
- Проверьте, что Nginx запущен: `sudo systemctl status nginx`
- Проверьте файрвол: `sudo ufw status`
- Убедитесь, что порт 80 открыт: `sudo ufw allow 80/tcp`

### Проблема: DNS не обновился

**Решение:**
- Подождите 5-15 минут после изменения DNS записей
- Проверьте DNS: `nslookup profitech.store`
- Убедитесь, что A-записи указывают на правильный IP

### Проблема: "Invalid response 404"

**Решение:**
- Убедитесь, что блок `.well-known/acme-challenge/` есть в конфигурации
- Проверьте права доступа: `sudo chown -R www-data:www-data /var/www/html`
- Проверьте, что Nginx может читать файлы: `sudo nginx -t`

## После успешной настройки SSL

Nginx автоматически обновит конфигурацию для использования HTTPS. Проверьте:

```bash
# Проверьте конфигурацию
sudo nginx -t

# Перезагрузите Nginx
sudo systemctl reload nginx

# Проверьте доступность HTTPS
curl -I https://profitech.store
```

