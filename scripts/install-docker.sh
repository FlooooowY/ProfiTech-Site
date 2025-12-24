#!/bin/bash

# Скрипт для установки Docker на Ubuntu

echo "🐳 Установка Docker..."

# Обновляем пакеты
sudo apt update

# Устанавливаем зависимости
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Добавляем официальный GPG ключ Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Добавляем репозиторий Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Обновляем пакеты
sudo apt update

# Устанавливаем Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Добавляем текущего пользователя в группу docker (чтобы не использовать sudo)
sudo usermod -aG docker $USER

echo "✅ Docker установлен!"
echo ""
echo "⚠️  ВАЖНО: Выйдите и войдите снова, чтобы изменения вступили в силу"
echo "   Или выполните: newgrp docker"
echo ""
echo "📋 Затем запустите LibreTranslate:"
echo "   docker run -d -p 5000:5000 --name libretranslate libretranslate/libretranslate"

