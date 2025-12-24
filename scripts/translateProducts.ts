/**
 * Скрипт для автоматического перевода товаров в MongoDB
 * Переводит названия, описания и характеристики товаров с русского на английский
 */

import { getCollection, closeConnection } from '../lib/db';
import { translate } from '@vitalets/google-translate-api';

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
const DELAY_BETWEEN_REQUESTS = 1000; // 1 секунда
const BATCH_SIZE = 10; // Обрабатываем по 10 товаров за раз

// Статистика
let stats = {
  total: 0,
  translated: 0,
  skipped: 0,
  errors: 0,
  updated: 0,
};

/**
 * Переводит текст с русского на английский
 */
async function translateText(text: string, retries = 3): Promise<string> {
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
        await sleep(DELAY_BETWEEN_REQUESTS);
      }
    }
    
    return translatedSentences.join(' ');
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await translate(text, { to: 'en', from: 'ru' });
      return result.text;
    } catch (error: any) {
      console.error(`  ⚠️ Ошибка перевода (попытка ${attempt}/${retries}):`, error.message);
      
      if (attempt < retries) {
        // Увеличиваем задержку при повторных попытках
        await sleep(DELAY_BETWEEN_REQUESTS * attempt);
      } else {
        // Если все попытки неудачны, возвращаем оригинальный текст
        console.warn(`  ⚠️ Не удалось перевести, оставляем оригинал`);
        return text;
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
      console.log(`  📝 Перевод названия: "${product.name.substring(0, 50)}..."`);
      updates.name_en = await translateText(product.name);
      await sleep(DELAY_BETWEEN_REQUESTS);
    } else if (product.name_en) {
      console.log(`  ⏭️ Название уже переведено`);
    }

    // Переводим описание
    if (product.description && !product.description_en) {
      const cleanDescription = stripHtml(product.description);
      if (cleanDescription.length > 0) {
        console.log(`  📝 Перевод описания (${cleanDescription.length} символов)...`);
        const translatedDescription = await translateText(cleanDescription);
        // Сохраняем переведенное описание (можно улучшить для сохранения HTML)
        updates.description_en = translatedDescription;
        await sleep(DELAY_BETWEEN_REQUESTS);
      }
    } else if (product.description_en) {
      console.log(`  ⏭️ Описание уже переведено`);
    }

    // Переводим характеристики
    if (product.characteristics && product.characteristics.length > 0) {
      const translatedCharacteristics = [];
      
      for (const char of product.characteristics) {
        const translatedChar: any = { ...char };
        
        // Переводим название характеристики
        if (char.name && !char.name_en) {
          console.log(`  📝 Перевод характеристики "${char.name}"...`);
          translatedChar.name_en = await translateText(char.name);
          await sleep(DELAY_BETWEEN_REQUESTS);
        } else if (char.name_en) {
          translatedChar.name_en = char.name_en;
        }
        
        // Переводим значение характеристики
        if (char.value && !char.value_en) {
          translatedChar.value_en = await translateText(char.value);
          await sleep(DELAY_BETWEEN_REQUESTS);
        } else if (char.value_en) {
          translatedChar.value_en = char.value_en;
        }
        
        translatedCharacteristics.push(translatedChar);
      }
      
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

    console.log(`📝 Товаров для перевода: ${productsToTranslate.length}\n`);

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

      for (const product of batch) {
        try {
          console.log(`\n🔄 Товар ${stats.translated + stats.skipped + 1}/${productsToTranslate.length}: ${product.name.substring(0, 60)}...`);
          
          const updates = await translateProduct(product);
          
          if (Object.keys(updates).length > 0) {
            // Обновляем товар в базе данных
            await productsCollection.updateOne(
              { _id: product._id },
              { $set: updates }
            );
            
            stats.updated++;
            console.log(`  ✅ Товар обновлен`);
          } else {
            stats.skipped++;
            console.log(`  ⏭️ Нет данных для перевода`);
          }
          
          stats.translated++;
        } catch (error) {
          stats.errors++;
          console.error(`  ❌ Ошибка при обработке товара:`, error);
          // Продолжаем со следующим товаром
        }
        
        // Задержка между товарами
        if (i + batch.length < productsToTranslate.length) {
          await sleep(DELAY_BETWEEN_REQUESTS);
        }
      }

      // Большая задержка между батчами
      if (i + BATCH_SIZE < productsToTranslate.length) {
        console.log(`\n⏳ Пауза между батчами...`);
        await sleep(DELAY_BETWEEN_REQUESTS * 2);
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

