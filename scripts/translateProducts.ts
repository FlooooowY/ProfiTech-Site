/**
 * Скрипт для автоматического перевода товаров в MongoDB
 * Переводит названия, описания и характеристики товаров с русского на английский
 */

import { getCollection, closeConnection } from '../lib/db';

// Опциональные импорты библиотек перевода (могут отсутствовать при сборке Next.js)
let translateVitalets: any;
let translateX: any;
let translateGoogle: any;

try {
  translateVitalets = require('@vitalets/google-translate-api').translate;
} catch (e) {
  // Игнорируем ошибку, если модуль не найден
}

try {
  translateX = require('google-translate-api-x').translate;
} catch (e) {
  // Игнорируем ошибку, если модуль не найден
}

try {
  translateGoogle = require('translate-google');
} catch (e) {
  // Игнорируем ошибку, если модуль не найден
}

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

// Задержка между запросами (мс) для избежания лимитов API
const DELAY_BETWEEN_REQUESTS = 1000; // 1 секунда - увеличено для избежания лимитов
const BATCH_SIZE = 20; // Обрабатываем по 20 товаров за раз
const PARALLEL_PRODUCTS = 2; // Обрабатываем 2 товара параллельно (уменьшено для избежания лимитов)

// Тип библиотеки для перевода
type TranslatorType = 'vitalets' | 'google-x' | 'translate-google';
let currentTranslator: TranslatorType = 'vitalets';
let translatorFailures: Record<TranslatorType, number> = {
  'vitalets': 0,
  'google-x': 0,
  'translate-google': 0,
};

// Статистика
let stats = {
  total: 0,
  translated: 0,
  skipped: 0,
  errors: 0,
  updated: 0,
};

/**
 * Проверяет, доступна ли библиотека перевода
 */
function isTranslatorAvailable(type: TranslatorType): boolean {
  switch (type) {
    case 'vitalets':
      return typeof translateVitalets === 'function';
    case 'google-x':
      return typeof translateX === 'function';
    case 'translate-google':
      return typeof translateGoogle === 'function';
    default:
      return false;
  }
}

/**
 * Переключает на следующую доступную библиотеку перевода
 */
function switchTranslator(): void {
  const translators: TranslatorType[] = ['vitalets', 'google-x', 'translate-google'];
  const currentIndex = translators.indexOf(currentTranslator);
  
  // Ищем следующую доступную библиотеку
  for (let i = 1; i <= translators.length; i++) {
    const nextIndex = (currentIndex + i) % translators.length;
    const nextTranslator = translators[nextIndex];
    if (isTranslatorAvailable(nextTranslator)) {
      currentTranslator = nextTranslator;
      console.log(`  🔄 Переключение на библиотеку: ${currentTranslator}`);
      return;
    }
  }
  
  throw new Error('Нет доступных библиотек перевода');
}

/**
 * Переводит текст используя текущую библиотеку
 */
async function translateWithCurrentLibrary(text: string): Promise<string> {
  if (!isTranslatorAvailable(currentTranslator)) {
    switchTranslator(); // Переключаемся на доступную библиотеку
  }
  
  switch (currentTranslator) {
    case 'vitalets':
      if (!translateVitalets) {
        throw new Error('Библиотека @vitalets/google-translate-api не установлена');
      }
      const result1 = await translateVitalets(text, { to: 'en', from: 'ru' });
      return result1.text;
    
    case 'google-x':
      if (!translateX) {
        throw new Error('Библиотека google-translate-api-x не установлена');
      }
      const result2 = await translateX(text, { to: 'en', from: 'ru' });
      return result2.text;
    
    case 'translate-google':
      if (!translateGoogle) {
        throw new Error('Библиотека translate-google не установлена');
      }
      const result3 = await translateGoogle(text, { from: 'ru', to: 'en' });
      return Array.isArray(result3) ? result3.join(' ') : result3;
    
    default:
      throw new Error(`Неизвестная библиотека: ${currentTranslator}`);
  }
}

/**
 * Переводит текст с русского на английский с автоматической ротацией библиотек
 */
async function translateText(text: string, retries = 5): Promise<string> {
  if (!text || text.trim().length === 0) {
    return text;
  }

  // Если текст слишком длинный, разбиваем на части
  const MAX_LENGTH = 5000;
  if (text.length > MAX_LENGTH) {
    // Разбиваем на предложения
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const translatedSentences: string[] = [];
    
    for (const sentence of sentences) {
      if (sentence.trim().length > 0) {
        const translated = await translateText(sentence.trim(), retries);
        translatedSentences.push(translated);
        await sleep(DELAY_BETWEEN_REQUESTS); // Задержка между предложениями
      }
    }
    
    return translatedSentences.join(' ');
  }

  // Пробуем перевести с текущей библиотекой, при ошибке переключаемся
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const translated = await translateWithCurrentLibrary(text);
      // Сбрасываем счетчик ошибок при успехе
      translatorFailures[currentTranslator] = 0;
      return translated;
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error(`  ⚠️ Ошибка перевода (${currentTranslator}, попытка ${attempt}/${retries}):`, errorMessage);
      
      // Увеличиваем счетчик ошибок для текущей библиотеки
      translatorFailures[currentTranslator]++;
      
      // Если слишком много ошибок с этой библиотекой, переключаемся
      if (translatorFailures[currentTranslator] >= 3) {
        switchTranslator();
        translatorFailures[currentTranslator] = 0; // Сбрасываем для новой библиотеки
      }
      
      if (attempt < retries) {
        // Увеличиваем задержку при повторных попытках
        const delay = DELAY_BETWEEN_REQUESTS * attempt * 2; // Увеличена задержка
        console.log(`  ⏳ Ожидание ${delay}мс перед повторной попыткой...`);
        await sleep(delay);
      } else {
        // Если все попытки неудачны, пробуем другую библиотеку
        if (attempt === retries) {
          const oldTranslator = currentTranslator;
          switchTranslator();
          if (currentTranslator !== oldTranslator) {
            console.log(`  🔄 Последняя попытка с другой библиотекой...`);
            try {
              const translated = await translateWithCurrentLibrary(text);
              return translated;
            } catch (finalError) {
              console.warn(`  ⚠️ Не удалось перевести, оставляем оригинал`);
              return text;
            }
          } else {
            console.warn(`  ⚠️ Не удалось перевести, оставляем оригинал`);
            return text;
          }
        }
      }
    }
  }
  
  return text;
}

/**
 * Очищает HTML от тегов для перевода
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/**
 * Восстанавливает HTML после перевода (простая версия)
 */
function restoreHtml(original: string, translated: string): string {
  // Простая замена - в реальности может потребоваться более сложная логика
  return translated;
}

/**
 * Переводит товар
 */
async function translateProduct(product: Product): Promise<Partial<Product>> {
  const updates: Partial<Product> = {};
  
  try {
    // Переводим название
    if (product.name && !product.name_en) {
      updates.name_en = await translateText(product.name);
    } else if (product.name_en) {
      // Название уже переведено
    }

    // Переводим описание
    if (product.description && !product.description_en) {
      const cleanDescription = stripHtml(product.description);
      if (cleanDescription.length > 0) {
        const translatedDescription = await translateText(cleanDescription);
        updates.description_en = translatedDescription;
      }
    }

    // Переводим характеристики параллельно
    if (product.characteristics && product.characteristics.length > 0) {
      const translatedCharacteristics = await Promise.all(
        product.characteristics.map(async (char) => {
          const translatedChar: any = { ...char };
          
          // Переводим название и значение характеристики параллельно
          const [nameEn, valueEn] = await Promise.all([
            char.name && !char.name_en 
              ? translateText(char.name).then(text => ({ name_en: text }))
              : Promise.resolve({ name_en: char.name_en || char.name }),
            char.value && !char.value_en 
              ? translateText(char.value).then(text => ({ value_en: text }))
              : Promise.resolve({ value_en: char.value_en || char.value }),
          ]);
          
          translatedChar.name_en = nameEn.name_en;
          translatedChar.value_en = valueEn.value_en;
          
          return translatedChar;
        })
      );
      
      updates.characteristics = translatedCharacteristics;
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
    console.log('🌐 Начинаем перевод товаров...\n');
    
    // Проверяем доступность библиотек перевода
    const availableTranslators: TranslatorType[] = [];
    if (isTranslatorAvailable('vitalets')) availableTranslators.push('vitalets');
    if (isTranslatorAvailable('google-x')) availableTranslators.push('google-x');
    if (isTranslatorAvailable('translate-google')) availableTranslators.push('translate-google');
    
    if (availableTranslators.length === 0) {
      console.error('❌ Ошибка: Нет доступных библиотек перевода!');
      console.error('💡 Установите хотя бы одну из библиотек:');
      console.error('   npm install @vitalets/google-translate-api');
      console.error('   npm install google-translate-api-x');
      console.error('   npm install translate-google');
      process.exit(1);
    }
    
    // Устанавливаем первую доступную библиотеку
    currentTranslator = availableTranslators[0];
    console.log(`✅ Доступные библиотеки перевода: ${availableTranslators.join(', ')}`);
    console.log(`📡 Используется: ${currentTranslator}\n`);

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
    console.log(`⚡ Режим: ${PARALLEL_PRODUCTS} товаров параллельно, батчи по ${BATCH_SIZE} товаров`);
    console.log(`🌐 Библиотека перевода: ${currentTranslator} (автоматическая ротация при ошибках)\n`);

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

      // Обрабатываем товары параллельно (по PARALLEL_PRODUCTS за раз)
      for (let j = 0; j < batch.length; j += PARALLEL_PRODUCTS) {
        const parallelBatch = batch.slice(j, j + PARALLEL_PRODUCTS);
        
        // Обрабатываем несколько товаров параллельно
        const results = await Promise.allSettled(
          parallelBatch.map(async (product) => {
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
              console.log(`  ✅ Товар ${result.value.productId} обновлен`);
            } else {
              console.log(`  ⏭️ Товар ${result.value.productId} пропущен`);
            }
          } else {
            stats.errors++;
            console.error(`  ❌ Ошибка при обработке товара:`, result.reason);
          }
        }
        
        // Небольшая задержка между группами параллельных товаров
        if (j + PARALLEL_PRODUCTS < batch.length) {
          await sleep(DELAY_BETWEEN_REQUESTS);
        }
      }

      // Минимальная задержка между батчами
      if (i + BATCH_SIZE < productsToTranslate.length) {
        await sleep(DELAY_BETWEEN_REQUESTS);
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
    console.log(`Ошибок: ${stats.errors}`);
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

