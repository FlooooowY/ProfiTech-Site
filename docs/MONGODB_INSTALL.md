# Установка MongoDB на VPS

## Способ 1: Через официальный репозиторий (рекомендуется)

```bash
# Определите версию Ubuntu
lsb_release -a

# Импортируйте ключ MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Добавьте репозиторий (замените jammy на вашу версию Ubuntu)
# Ubuntu 20.04: focal
# Ubuntu 22.04: jammy
# Ubuntu 24.04: noble
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Обновите список пакетов
sudo apt update

# Установите MongoDB
sudo apt install -y mongodb-org

# Запустите MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Проверьте статус
sudo systemctl status mongod
```

## Способ 2: Через Snap (если репозиторий не работает)

```bash
# Установите MongoDB через snap
sudo snap install mongodb

# Запустите MongoDB
sudo snap start mongodb

# Проверьте статус
sudo snap services mongodb
```

## Способ 3: Ручная установка (если другие способы не работают)

```bash
# Скачайте установщик
wget https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2204-7.0.0.tgz

# Распакуйте
tar -xzf mongodb-linux-x86_64-ubuntu2204-7.0.0.tgz

# Переместите в /opt
sudo mv mongodb-linux-x86_64-ubuntu2204-7.0.0 /opt/mongodb

# Создайте директорию для данных
sudo mkdir -p /var/lib/mongodb
sudo mkdir -p /var/log/mongodb
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown -R mongodb:mongodb /var/log/mongodb

# Создайте systemd service
sudo nano /etc/systemd/system/mongod.service
```

Добавьте в файл:

```ini
[Unit]
Description=MongoDB Database Server
Documentation=https://docs.mongodb.com/manual
After=network.target

[Service]
User=mongodb
Group=mongodb
ExecStart=/opt/mongodb/bin/mongod --config /etc/mongod.conf
PIDFile=/var/run/mongodb/mongod.pid
Type=forking
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Создайте конфигурационный файл
sudo nano /etc/mongod.conf
```

Добавьте:

```yaml
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  fork: true
  pidFilePath: /var/run/mongodb/mongod.pid
```

```bash
# Запустите MongoDB
sudo systemctl daemon-reload
sudo systemctl start mongod
sudo systemctl enable mongod
```

## Проверка установки

```bash
# Проверьте версию
mongosh --version

# Подключитесь к MongoDB
mongosh

# В консоли MongoDB выполните:
db.version()
# Должна вернуться версия MongoDB
```

## Создание пользователя

```bash
# Подключитесь к MongoDB
mongosh

# В консоли MongoDB:
use admin
db.createUser({
  user: "admin_db",
  pwd: "admin_db",
  roles: [
    { role: "readWrite", db: "profitech_db" },
    { role: "dbAdmin", db: "profitech_db" }
  ]
})

# Выйдите
exit
```

## Включение аутентификации

```bash
# Отредактируйте конфигурацию
sudo nano /etc/mongod.conf
```

Добавьте/измените:

```yaml
security:
  authorization: enabled
```

```bash
# Перезапустите MongoDB
sudo systemctl restart mongod
```

## Проверка подключения

```bash
# Попробуйте подключиться с аутентификацией
mongosh -u admin_db -p admin_db --authenticationDatabase admin profitech_db

# Должно подключиться без ошибок
```

