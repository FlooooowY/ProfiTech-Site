/**
 * Скрипт для быстрого перевода товаров в MongoDB
 * Использует локальный сервер перевода (LibreTranslate) для обхода лимитов API
 * 
 * ТРЕБОВАНИЯ:
 * 1. Установите LibreTranslate локально:
 *    docker run -ti --rm -p 5000:5000 libretranslate/libretranslate
 * 
 * 2. Или используйте публичный API (с лимитами):
 *    https://libretranslate.com/
 */

import { getCollection, closeConnection } from '../lib/db';

interface Product {
  _id?: any;
  id: string;
  name: string;
  name_en?: string;
  description: string;
  description_en?: string;
  characteristics?: Array<{
    name: string;
    name_en?: string;
    value: string;
    value_en?: string;
  }>;
  [key: string]: any;
}

// Конфигурация
const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || 'http://localhost:5000';
const FALLBACK_URL = 'https://libretranslate.com'; // Публичный API как запасной вариант
const BATCH_SIZE = 1000; // Обрабатываем по 1000 товаров за раз
const PARALLEL_REQUESTS = 50; // 50 параллельных запросов к API
const DELAY_BETWEEN_BATCHES = 100; // 100мс между батчами

// Текущий URL для использования (может переключиться на fallback)
let currentTranslateUrl = LIBRETRANSLATE_URL;

// Кэш для одинаковых текстов (чтобы не переводить повторно)
const translationCache = new Map<string, string>();

// Статистика
let stats = {
  total: 0,
  translated: 0,
  skipped: 0,
  errors: 0,
  updated: 0,
  cached: 0,
};

/**
 * Проверяет доступность LibreTranslate API
 */
async function checkLibreTranslateAvailability(): Promise<boolean> {
  // Сначала пробуем локальный сервер
  try {
    console.log(`🔍 Проверка доступности LibreTranslate на ${LIBRETRANSLATE_URL}...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут
    
    const response = await fetch(`${LIBRETRANSLATE_URL}/languages`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log('✅ LibreTranslate доступен и готов к работе\n');
      currentTranslateUrl = LIBRETRANSLATE_URL;
      return true;
    } else {
      console.error(`❌ LibreTranslate вернул ошибку: HTTP ${response.status}`);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('❌ Таймаут при подключении к локальному LibreTranslate (5 секунд)');
    } else {
      console.error(`❌ Ошибка подключения к локальному LibreTranslate: ${error.message}`);
    }
  }
  
  // Если локальный сервер недоступен, пробуем публичный API
  if (LIBRETRANSLATE_URL === 'http://localhost:5000' || LIBRETRANSLATE_URL.includes('localhost')) {
    console.log(`\n🔄 Пробуем использовать публичный API: ${FALLBACK_URL}...`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд для публичного API
      
      const response = await fetch(`${FALLBACK_URL}/languages`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('✅ Публичный LibreTranslate API доступен (будет использован как запасной вариант)\n');
        console.log('⚠️  Внимание: Публичный API имеет лимиты, скорость будет ниже\n');
        currentTranslateUrl = FALLBACK_URL;
        return true;
      }
    } catch (error: any) {
      console.error(`❌ Публичный API также недоступен: ${error.message}`);
    }
  }
  
  // Оба варианта недоступны
  console.error('\n💡 Решение проблемы:');
  console.error('   1. Убедитесь, что LibreTranslate запущен:');
  console.error('      docker ps | grep libretranslate');
  console.error('   2. Если не запущен, запустите:');
  console.error('      docker start libretranslate');
  console.error('      или');
  console.error('      docker run -d -p 5000:5000 --name libretranslate libretranslate/libretranslate');
  console.error('   3. Или используйте автоматический запуск:');
  console.error('      npm run services:start');
  console.error('   4. Проверьте доступность API:');
  console.error(`      curl ${LIBRETRANSLATE_URL}/languages`);
  console.error('');
  return false;
}

/**
 * Переводит текст через LibreTranslate API
 */
async function translateText(text: string, retries: number = 3): Promise<string> {
  if (!text || text.trim().length === 0) {
    return text;
  }

  // Проверяем кэш
  const cacheKey = text.trim().toLowerCase();
  if (translationCache.has(cacheKey)) {
    stats.cached++;
    return translationCache.get(cacheKey)!;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут
      
      const response = await fetch(`${currentTranslateUrl}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'ru',
          target: 'en',
          format: 'text',
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const translated = data.translatedText || text;

      // Сохраняем в кэш
      translationCache.set(cacheKey, translated);

      return translated;
    } catch (error: any) {
      if (attempt === retries) {
        // Последняя попытка - логируем ошибку
        if (error.name === 'AbortError') {
          console.error(`  ⚠️ Таймаут при переводе текста (попытка ${attempt}/${retries})`);
        } else if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
          console.error(`  ⚠️ Не удалось подключиться к LibreTranslate (попытка ${attempt}/${retries})`);
          console.error(`     Убедитесь, что сервер запущен: docker ps | grep libretranslate`);
        } else {
          console.error(`  ⚠️ Ошибка перевода (попытка ${attempt}/${retries}): ${error.message}`);
        }
        // Возвращаем оригинал при ошибке
        return text;
      } else {
        // Повторная попытка после задержки
        await sleep(1000 * attempt);
      }
    }
  }
  
  return text;
}

/**
 * Переводит массив текстов параллельно
 */
async function translateBatch(texts: string[]): Promise<string[]> {
  const results = await Promise.allSettled(
    texts.map(text => translateText(text))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`  ⚠️ Ошибка перевода текста ${index}:`, result.reason);
      return texts[index]; // Возвращаем оригинал при ошибке
    }
  });
}

/**
 * Переводит товар
 */
async function translateProduct(product: Product): Promise<Partial<Product>> {
  const updates: Partial<Product> = {};
  
  try {
    // Собираем все тексты для перевода
    const textsToTranslate: { key: string; text: string }[] = [];
    
    if (product.name && !product.name_en) {
      textsToTranslate.push({ key: 'name', text: product.name });
    }

    if (product.description && !product.description_en) {
      const cleanDescription = product.description.replace(/<[^>]*>/g, '').trim();
      if (cleanDescription.length > 0) {
        textsToTranslate.push({ key: 'description', text: cleanDescription });
      }
    }

    // Характеристики
    if (product.characteristics && product.characteristics.length > 0) {
      const characteristicsUpdates: any[] = [];
      
      for (const char of product.characteristics) {
        const charUpdate: any = { ...char };
        
        if (char.name && !char.name_en) {
          textsToTranslate.push({ key: `char_name_${char.name}`, text: char.name });
        }
        
        if (char.value && !char.value_en) {
          textsToTranslate.push({ key: `char_value_${char.value}`, text: char.value });
        }
        
        characteristicsUpdates.push(charUpdate);
      }
      
      if (characteristicsUpdates.length > 0) {
        updates.characteristics = characteristicsUpdates;
      }
    }

    // Переводим все тексты параллельно
    if (textsToTranslate.length > 0) {
      const texts = textsToTranslate.map(t => t.text);
      const translatedTexts = await translateBatch(texts);

      // Применяем переводы
      for (let i = 0; i < textsToTranslate.length; i++) {
        const { key, text } = textsToTranslate[i];
        const translated = translatedTexts[i];

        if (key === 'name') {
          updates.name_en = translated;
        } else if (key === 'description') {
          updates.description_en = translated;
        } else if (key.startsWith('char_name_')) {
          const charName = key.replace('char_name_', '');
          const charIndex = product.characteristics!.findIndex(c => c.name === charName);
          if (charIndex >= 0 && updates.characteristics) {
            updates.characteristics[charIndex].name_en = translated;
          }
        } else if (key.startsWith('char_value_')) {
          const charValue = key.replace('char_value_', '');
          const charIndex = product.characteristics!.findIndex(c => c.value === charValue);
          if (charIndex >= 0 && updates.characteristics) {
            updates.characteristics[charIndex].value_en = translated;
          }
        }
      }
    }

    return updates;
  } catch (error) {
    console.error(`  ❌ Ошибка при переводе товара ${product.id}:`, error);
    throw error;
  }
}

/**
 * Задержка
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Основная функция
 */
async function translateProducts() {
  try {
    console.log('🌐 Начинаем быстрый перевод товаров через LibreTranslate...\n');
    console.log(`📡 URL сервера перевода: ${LIBRETRANSLATE_URL}\n`);

    // Проверяем доступность LibreTranslate перед началом работы
    const isAvailable = await checkLibreTranslateAvailability();
    if (!isAvailable) {
      console.error('\n❌ LibreTranslate недоступен. Прерываем выполнение.');
      console.error('💡 Запустите сервисы: npm run services:start');
      process.exit(1);
    }
    
    console.log(`📡 Используется сервер перевода: ${currentTranslateUrl}\n`);

    const productsCollection = await getCollection<Product>('products');
    
    // Получаем общее количество товаров
    stats.total = await productsCollection.countDocuments();
    console.log(`📊 Всего товаров в базе: ${stats.total}\n`);

    // Получаем товары, которые еще не переведены
    const productsToTranslate = await productsCollection
      .find({
        $or: [
          { name_en: { $exists: false } },
          { description_en: { $exists: false } },
          { 'characteristics.name_en': { $exists: false } },
          { 'characteristics.value_en': { $exists: false } },
        ]
      })
      .toArray();

    console.log(`📝 Товаров для перевода: ${productsToTranslate.length}`);
    console.log(`⚡ Режим: ${PARALLEL_REQUESTS} параллельных запросов, батчи по ${BATCH_SIZE} товаров\n`);

    if (productsToTranslate.length === 0) {
      console.log('✅ Все товары уже переведены!');
      return;
    }

    // Обрабатываем товары батчами
    for (let i = 0; i < productsToTranslate.length; i += BATCH_SIZE) {
      const batch = productsToTranslate.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(productsToTranslate.length / BATCH_SIZE);

      console.log(`\n📦 Батч ${batchNumber}/${totalBatches} (товары ${i + 1}-${Math.min(i + BATCH_SIZE, productsToTranslate.length)})`);

      // Обрабатываем товары параллельно
      const results = await Promise.allSettled(
        batch.map(async (product) => {
          const updates = await translateProduct(product);
          
          if (Object.keys(updates).length > 0) {
            // Обновляем товар в базе данных
            await productsCollection.updateOne(
              { _id: product._id },
              { $set: updates }
            );
            
            stats.updated++;
            return { success: true, productId: product.id };
          } else {
            stats.skipped++;
            return { success: false, skipped: true, productId: product.id };
          }
        })
      );
      
      // Обрабатываем результаты
      for (const result of results) {
        stats.translated++;
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            // Не логируем каждый товар для скорости
          } else {
            // Пропущенные товары
          }
        } else {
          stats.errors++;
          console.error(`  ❌ Ошибка:`, result.reason);
        }
      }

      // Показываем прогресс каждые 100 товаров
      if (i % 100 === 0 || i + BATCH_SIZE >= productsToTranslate.length) {
        const progress = ((i + batch.length) / productsToTranslate.length * 100).toFixed(1);
        console.log(`  📊 Прогресс: ${progress}% (${i + batch.length}/${productsToTranslate.length}) | Обновлено: ${stats.updated} | Кэш: ${stats.cached} | Ошибок: ${stats.errors}`);
      }

      // Небольшая задержка между батчами
      if (i + BATCH_SIZE < productsToTranslate.length) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    // Выводим статистику
    console.log('\n' + '='.repeat(60));
    console.log('📊 СТАТИСТИКА ПЕРЕВОДА');
    console.log('='.repeat(60));
    console.log(`Всего товаров: ${stats.total}`);
    console.log(`Обработано: ${stats.translated}`);
    console.log(`Обновлено: ${stats.updated}`);
    console.log(`Пропущено: ${stats.skipped}`);
    console.log(`Использовано из кэша: ${stats.cached}`);
    console.log(`Ошибок: ${stats.errors}`);
    console.log(`Размер кэша: ${translationCache.size} уникальных текстов`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    throw error;
  } finally {
    await closeConnection();
  }
}

// Запуск скрипта
if (require.main === module) {
  translateProducts()
    .then(() => {
      console.log('\n✅ Перевод завершен!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Ошибка выполнения скрипта:', error);
      process.exit(1);
    });
}

export { translateProducts };

