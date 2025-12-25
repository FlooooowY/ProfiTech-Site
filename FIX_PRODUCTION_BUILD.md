# Исправление ошибок production

## Проблема 1: OpenRouter API Error 401

**Ошибка:** `OpenRouter API Error: 401 {"error":{"message":"User not found.","code":401}}`

**Причина:** Неверный или отсутствующий API ключ OpenRouter.

**Решение:**
1. Получите API ключ на https://openrouter.ai/
2. Добавьте его в `.env.local`:
   ```
   OPENROUTER_API_KEY=ваш_ключ_здесь
   ```
3. Перезапустите приложение

**Примечание:** Если API ключ не установлен, бот автоматически использует fallback логику (поиск товаров без AI).

## Проблема 2: Production build не найден

**Ошибка:** `Error: Could not find a production build in the '.next' directory. Try building your app with 'next build' before starting the production server.`

**Причина:** Приложение пытается запуститься в production режиме (`next start`), но нет собранной версии.

**Решение:**

### Вариант 1: Сборка и запуск production
```bash
# Соберите приложение
npm run build

# Запустите production сервер
npm start
```

### Вариант 2: Запуск в development режиме
```bash
# Запустите development сервер (не требует build)
npm run dev
```

### Вариант 3: Автоматическая сборка при деплое
Если используете PM2 или другой процесс-менеджер, добавьте в скрипт запуска:
```bash
npm run build && npm start
```

## Проверка после исправления

1. Убедитесь, что `.env.local` содержит правильный `OPENROUTER_API_KEY`
2. Выполните `npm run build` перед запуском production сервера
3. Проверьте логи - ошибки 401 должны исчезнуть, бот будет использовать fallback логику если ключ неверный

