# Как проверить, что DNS записи применены

## Быстрая проверка (на сервере)

### 1. Используйте готовый скрипт

```bash
cd ~/ProfiTech-Site
git pull
chmod +x scripts/check-dns-records.sh
npm run dns:check
```

Скрипт автоматически проверит все DNS записи и покажет, что настроено правильно, а что нет.

### 2. Ручная проверка через nslookup

```bash
# Проверка A-записи для корневого домена
nslookup profitech.store

# Проверка A-записи для www
nslookup www.profitech.store
```

**Ожидаемый результат:**
```
Server:         127.0.0.53
Address:        127.0.0.53#53

Non-authoritative answer:
Name:   profitech.store
Address: 82.26.91.241
```

Если видите IP адрес `82.26.91.241` (или ваш IP сервера) - записи применены!

### 3. Проверка через dig (более подробно)

```bash
# Проверка A-записи
dig profitech.store A

# Проверка A-записи для www
dig www.profitech.store A

# Проверка всех записей
dig profitech.store ANY
```

**Ожидаемый результат:**
```
;; ANSWER SECTION:
profitech.store.    3600    IN      A       82.26.91.241
```

### 4. Проверка через curl (проверка доступности)

```bash
# Проверка доступности домена
curl -I http://profitech.store

# Или просто
curl http://profitech.store
```

Если домен доступен (HTTP 200, 301, 302) - DNS записи работают!

## Проверка с вашего компьютера (Windows)

### Через командную строку (cmd или PowerShell)

```cmd
# Проверка A-записи
nslookup profitech.store

# Проверка www
nslookup www.profitech.store
```

### Через PowerShell (более подробно)

```powershell
# Проверка A-записи
Resolve-DnsName profitech.store -Type A

# Проверка всех записей
Resolve-DnsName profitech.store
```

### Через браузер

Просто откройте в браузере:
- `http://profitech.store`
- `http://www.profitech.store`

Если сайт открывается - DNS записи работают!

## Онлайн проверка DNS

Можно использовать онлайн сервисы:

1. **https://dnschecker.org/**
   - Введите домен: `profitech.store`
   - Выберите тип записи: `A`
   - Нажмите "Search"
   - Должен показать IP: `82.26.91.241`

2. **https://www.whatsmydns.net/**
   - Введите домен: `profitech.store`
   - Выберите тип: `A Record`
   - Проверьте результат

3. **https://mxtoolbox.com/DNSLookup.aspx**
   - Введите домен: `profitech.store`
   - Выберите тип: `A`
   - Проверьте результат

## Что проверить

После добавления DNS записей проверьте:

1. ✅ **A-запись для @ (корневой домен)**
   ```bash
   nslookup profitech.store
   # Должен вернуть: 82.26.91.241
   ```

2. ✅ **A-запись для www**
   ```bash
   nslookup www.profitech.store
   # Должен вернуть: 82.26.91.241
   ```

3. ✅ **Доступность домена**
   ```bash
   curl http://profitech.store
   # Должен вернуть HTML код сайта
   ```

## Время распространения DNS

- **Обычно:** 5-15 минут
- **Максимум:** до 24 часов (но обычно быстрее)
- **TTL:** Если TTL = 3600 (1 час), изменения распространяются быстрее

## Если записи не применяются

1. **Подождите еще 10-15 минут** - DNS может распространяться медленно

2. **Очистите DNS кэш:**
   ```bash
   # На Linux
   sudo systemd-resolve --flush-caches
   
   # На Windows
   ipconfig /flushdns
   
   # На Mac
   sudo dscacheutil -flushcache
   ```

3. **Проверьте через разные DNS серверы:**
   ```bash
   # Google DNS
   nslookup profitech.store 8.8.8.8
   
   # Cloudflare DNS
   nslookup profitech.store 1.1.1.1
   ```

4. **Проверьте в панели HOSTKEY:**
   - Убедитесь, что записи действительно добавлены
   - Проверьте, что IP адрес правильный
   - Убедитесь, что нет опечаток

5. **Проверьте nameservers у регистратора:**
   - Должны быть указаны: `ns1.hostkey.ru` и `ns2.hostkey.ru`
   - Если нет - DNS записи в HOSTKEY не будут работать!

## Быстрая команда для проверки всего

```bash
# На сервере
cd ~/ProfiTech-Site && npm run dns:check
```

Эта команда проверит все автоматически и покажет подробный отчет!

