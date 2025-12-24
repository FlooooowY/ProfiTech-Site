# Исправление конфликта имен серверов в Nginx

## Проблема
```
nginx: [warn] conflicting server name "profitech.store" on 0.0.0.0:80, ignored
```

Это означает, что в конфигурации Nginx есть несколько блоков `server` с одинаковым `server_name`.

## Решение

### Шаг 1: Найдите все конфигурации с вашим доменом

```bash
# Найдите все упоминания домена
sudo grep -r "profitech.store" /etc/nginx/
```

### Шаг 2: Проверьте активные конфигурации

```bash
# Посмотрите все активные конфигурации
ls -la /etc/nginx/sites-enabled/

# Проверьте содержимое каждого файла
sudo cat /etc/nginx/sites-enabled/default
sudo cat /etc/nginx/sites-enabled/profitech
```

### Шаг 3: Удалите или закомментируйте дубликаты

**Вариант A: Удалить дефолтную конфигурацию (если она не нужна)**

```bash
sudo rm /etc/nginx/sites-enabled/default
```

**Вариант B: Закомментировать конфликтующий блок в файле**

```bash
# Откройте файл с конфликтом
sudo nano /etc/nginx/sites-enabled/default

# Найдите блок server с profitech.store и закомментируйте его:
# server {
#     listen 80;
#     server_name profitech.store;
#     ...
# }
```

**Вариант C: Удалить дублирующий файл**

```bash
# Если есть другой файл с таким же доменом
sudo rm /etc/nginx/sites-enabled/другой-файл.conf
```

### Шаг 4: Проверьте конфигурацию

```bash
# Проверьте синтаксис
sudo nginx -t

# Если все ОК, перезапустите Nginx
sudo systemctl reload nginx
```

### Шаг 5: Убедитесь, что только один файл активен

```bash
# Должен быть только один файл с вашим доменом
sudo grep -r "server_name.*profitech.store" /etc/nginx/sites-enabled/

# Должен показать только один результат
```

## Быстрое решение (если дефолтная конфигурация не нужна)

```bash
# Удалите дефолтную конфигурацию
sudo rm /etc/nginx/sites-enabled/default

# Проверьте
sudo nginx -t

# Перезапустите
sudo systemctl reload nginx
```

## Проверка после исправления

```bash
# Проверьте статус
sudo systemctl status nginx

# Проверьте логи
sudo tail -f /var/log/nginx/error.log

# Проверьте доступность сайта
curl -I http://profitech.store
```

## Если проблема осталась

1. Проверьте основной конфигурационный файл:
   ```bash
   sudo nano /etc/nginx/nginx.conf
   ```
   Убедитесь, что там нет блоков `server` с вашим доменом.

2. Проверьте все файлы в `sites-available`:
   ```bash
   sudo grep -r "server_name.*profitech" /etc/nginx/sites-available/
   ```

3. Убедитесь, что в `sites-enabled` только нужные файлы:
   ```bash
   ls -la /etc/nginx/sites-enabled/
   ```

