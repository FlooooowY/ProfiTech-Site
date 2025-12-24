# Альтернативные способы перевода товаров

Если Docker недоступен, используйте один из этих вариантов:

## Вариант 1: Установка Docker (рекомендуется)

```bash
# Запустите скрипт установки
chmod +x scripts/install-docker.sh
./scripts/install-docker.sh

# Выйдите и войдите снова (или выполните: newgrp docker)

# Запустите LibreTranslate
docker run -d -p 5000:5000 --name libretranslate libretranslate/libretranslate

# Запустите перевод
npm run db:translate-products-fast
```

## Вариант 2: Публичный API LibreTranslate (медленнее, но без установки)

```bash
# Установите переменную окружения
export LIBRETRANSLATE_URL=https://libretranslate.com

# Запустите скрипт
npm run db:translate-products-fast
```

**Внимание:** Публичный API имеет лимиты (~10 запросов/сек), поэтому перевод займет 2-3 часа.

## Вариант 3: Установка LibreTranslate через Python (без Docker)

```bash
# Установите Python и pip
sudo apt update
sudo apt install -y python3 python3-pip

# Установите LibreTranslate
pip3 install libretranslate

# Запустите сервер (в отдельном терминале или через screen/tmux)
libretranslate --host 0.0.0.0 --port 5000

# В другом терминале запустите перевод
npm run db:translate-products-fast
```

## Вариант 4: Использование оригинального скрипта с задержками

Если ничего не работает, используйте оригинальный скрипт с увеличенными задержками:

```bash
npm run db:translate-products
```

Это займет несколько дней, но будет работать.

## Рекомендация

Для 126k товаров за 10-15 минут **обязательно нужен локальный сервер**. 

Лучший вариант: **Установите Docker** (скрипт `scripts/install-docker.sh`).

