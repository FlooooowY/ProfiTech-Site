# Конфигурация Nginx для домена

## Проблема
Сайт открывается по IP:3000 вместо домена.

## Решение

### 1. Создайте конфигурационный файл Nginx

Подключитесь к серверу и создайте файл конфигурации:

```bash
sudo nano /etc/nginx/sites-available/profitech
```

### 2. Добавьте следующую конфигурацию:

```nginx
server {
    listen 80;
    server_name profitech.store www.profitech.store;  # Замените на ваш домен
    
    # Редирект на HTTPS (после настройки SSL)
    # return 301 https://$server_name$request_uri;
    
    # Пока оставляем HTTP (уберите комментарий выше после настройки SSL)
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
        
        # Таймауты для долгих запросов
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
    
    location /uploads {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400";
    }
    
    # Максимальный размер загружаемых файлов
    client_max_body_size 50M;
}
```

### 3. Активируйте конфигурацию

```bash
# Создайте символическую ссылку
sudo ln -s /etc/nginx/sites-available/profitech /etc/nginx/sites-enabled/

# Удалите дефолтную конфигурацию (если есть)
sudo rm /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
sudo nginx -t
```

### 4. Перезапустите Nginx

```bash
sudo systemctl restart nginx
```

### 5. Проверьте статус

```bash
sudo systemctl status nginx
```

### 6. Настройте DNS

Убедитесь, что в настройках DNS вашего домена указаны A-записи:

```
A     @     ваш-ip-адрес-сервера
A     www   ваш-ip-адрес-сервера
```

### 7. Настройте SSL (Let's Encrypt)

После того как домен будет работать, настройте SSL:

```bash
# Установите Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Получите сертификат
sudo certbot --nginx -d profitech.store -d www.profitech.store

# Автоматическое обновление
sudo certbot renew --dry-run
```

После этого обновите конфигурацию Nginx, раскомментировав строку редиректа на HTTPS.

### 8. Проверка

После настройки проверьте:

```bash
# Проверьте, что Nginx слушает порт 80
sudo netstat -tulpn | grep :80

# Проверьте логи Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Проверьте, что приложение работает на порту 3000
curl http://localhost:3000
```

### Решение проблем

#### Nginx не запускается:
```bash
sudo nginx -t  # Проверьте синтаксис
sudo systemctl status nginx  # Проверьте статус
sudo journalctl -u nginx -n 50  # Посмотрите логи
```

#### 502 Bad Gateway:
- Убедитесь, что приложение работает: `pm2 status`
- Проверьте, что порт 3000 открыт: `sudo netstat -tulpn | grep :3000`
- Проверьте логи: `pm2 logs profitech`

#### Домен не открывается:
- Проверьте DNS: `nslookup profitech.store`
- Проверьте файрвол: `sudo ufw status`
- Убедитесь, что порт 80 открыт: `sudo ufw allow 80/tcp`

