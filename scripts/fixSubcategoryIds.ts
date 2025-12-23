/**
 * Скрипт для исправления формата subcategoryId во всех товарах
 * Приводит subcategoryId к единому формату: ${categorySlug}-${subcategorySlug}
 */

import { getCollection, closeConnection } from '../lib/db';

async function fixSubcategoryIds() {
  try {
    console.log('🔧 Начинаем исправление subcategoryId...\n');

    const productsCollection = await getCollection('products');
    const categoriesCollection = await getCollection('categories');
    const subcategoriesCollection = await getCollection('subcategories');

    // Получаем все категории и подкатегории для маппинга
    const categories = await categoriesCollection.find({}).toArray();
    const subcategories = await subcategoriesCollection.find({}).toArray();

    // Создаем мапы для быстрого поиска
    const categoryMap = new Map();
    categories.forEach((cat: any) => {
      categoryMap.set(cat._id, cat.slug || cat._id);
      categoryMap.set(cat.id, cat.slug || cat._id);
    });

    const subcategoryMap = new Map();
    subcategories.forEach((sub: any) => {
      subcategoryMap.set(sub._id, {
        slug: sub.slug || sub._id,
        categoryId: sub.categoryId
      });
      subcategoryMap.set(sub.id, {
        slug: sub.slug || sub._id,
        categoryId: sub.categoryId
      });
    });

    console.log(`📊 Найдено категорий: ${categories.length}`);
    console.log(`📊 Найдено подкатегорий: ${subcategories.length}\n`);

    // Получаем все товары
    const products = await productsCollection.find({}).toArray();
    console.log(`📦 Всего товаров: ${products.length}\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let debugCount = 0;
    const debugSamples: any[] = [];

    // Обрабатываем товары батчами
    const batchSize = 1000;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const bulkOps: any[] = [];

      for (const product of batch) {
        const prod: any = product;
        
        if (!prod.subcategoryId || !prod.categoryId) {
          skipped++;
          continue;
        }

        // Получаем slug категории
        const categorySlug = categoryMap.get(prod.categoryId);
        if (!categorySlug) {
          console.warn(`⚠️  Категория не найдена для товара ${prod._id}: categoryId=${prod.categoryId}`);
          errors++;
          continue;
        }

        // Определяем текущий формат subcategoryId
        const currentSubcategoryId = prod.subcategoryId;
        
        // Проверяем, нужно ли исправлять
        // Правильный формат: ${categorySlug}-${subcategorySlug}
        const expectedPrefix = `${categorySlug}-`;
        
        // Проверяем, начинается ли с правильного префикса категории
        if (currentSubcategoryId.startsWith(expectedPrefix)) {
          // Извлекаем часть после категории
          const subcategoryPart = currentSubcategoryId.substring(expectedPrefix.length);
          
          // Проверяем, совпадает ли эта часть с каким-либо slug подкатегории из констант
          const matchingSub = subcategories.find((sub: any) => {
            if (sub.categoryId !== prod.categoryId) return false;
            const subSlug = sub.slug || sub._id;
            return subSlug === subcategoryPart;
          });
          
          if (matchingSub) {
            // Уже правильный формат - совпадает со slug из констант
            skipped++;
            continue;
          }
          
          // Если не совпадает, собираем информацию для отладки
          if (debugCount < 5) {
            const categorySubs = subcategories.filter((sub: any) => sub.categoryId === prod.categoryId);
            debugSamples.push({
              productId: prod._id,
              categoryId: prod.categoryId,
              categorySlug,
              currentSubcategoryId,
              subcategoryPart,
              availableSubSlugs: categorySubs.map((s: any) => s.slug || s._id).slice(0, 5)
            });
            debugCount++;
          }
          // Если не совпадает, нужно исправить
        }

        // Пытаемся найти подкатегорию
        let subcategorySlug = null;
        
        // Вариант 1: subcategoryId это ID подкатегории (например, "1-3")
        const subcategoryInfo = subcategoryMap.get(currentSubcategoryId);
        if (subcategoryInfo) {
          subcategorySlug = subcategoryInfo.slug;
        } else {
          // Вариант 2: subcategoryId уже в формате category-subcategory
          // Извлекаем часть после категории
          const parts = currentSubcategoryId.split('-');
          if (parts.length > 1) {
            // Убираем первую часть (categorySlug) и получаем subcategory часть
            const subcategoryPart = parts.slice(1).join('-');
            
            // Ищем подкатегорию по slug или по названию
            // Сначала пробуем точное совпадение slug
            let subBySlug = subcategories.find((sub: any) => 
              (sub.slug === subcategoryPart || sub._id === subcategoryPart) &&
              sub.categoryId === prod.categoryId
            );
            
            // Если не нашли, пробуем найти по названию подкатегории
            // Преобразуем subcategoryPart обратно в читаемое название и сравниваем
            if (!subBySlug) {
              // Нормализуем subcategoryPart для сравнения
              const normalizedPart = subcategoryPart.toLowerCase().replace(/-/g, '');
              
              subBySlug = subcategories.find((sub: any) => {
                if (sub.categoryId !== prod.categoryId) return false;
                
                // Нормализуем slug подкатегории
                const normalizedSlug = (sub.slug || sub._id || '').toLowerCase().replace(/-/g, '');
                
                // Нормализуем название подкатегории (убираем пробелы и спецсимволы)
                const normalizedName = (sub.name || '').toLowerCase()
                  .replace(/\s+/g, '')
                  .replace(/[^a-zа-яё0-9]/gi, '');
                
                // Генерируем slug из названия подкатегории (как это делается в generateSubcategoryId)
                const nameAsSlug = (sub.name || '')
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^a-zа-яё0-9-]/gi, '')
                  .replace(/-+/g, '-')
                  .trim();
                const normalizedNameAsSlug = nameAsSlug.replace(/-/g, '');
                
                // Проверяем различные варианты совпадения
                return normalizedSlug === normalizedPart || 
                       normalizedName === normalizedPart ||
                       normalizedNameAsSlug === normalizedPart ||
                       normalizedSlug.includes(normalizedPart) ||
                       normalizedPart.includes(normalizedSlug) ||
                       normalizedName.includes(normalizedPart) ||
                       normalizedPart.includes(normalizedName);
              });
            }
            
            if (subBySlug) {
              subcategorySlug = (subBySlug as any).slug || (subBySlug as any)._id;
            } else {
              // Вариант 3: subcategoryId это просто slug без категории
              const subByDirectSlug = subcategories.find((sub: any) => 
                (sub.slug === currentSubcategoryId || sub._id === currentSubcategoryId) &&
                sub.categoryId === prod.categoryId
              );
              
              if (subByDirectSlug) {
                subcategorySlug = (subByDirectSlug as any).slug || (subByDirectSlug as any)._id;
              }
            }
          } else {
            // Вариант 4: subcategoryId это просто slug без категории
            const subByDirectSlug = subcategories.find((sub: any) => 
              (sub.slug === currentSubcategoryId || sub._id === currentSubcategoryId) &&
              sub.categoryId === prod.categoryId
            );
            
            if (subByDirectSlug) {
              subcategorySlug = (subByDirectSlug as any).slug || (subByDirectSlug as any)._id;
            }
          }
        }

        if (!subcategorySlug) {
          console.warn(`⚠️  Не удалось найти подкатегорию для товара ${prod._id}: subcategoryId=${currentSubcategoryId}, categoryId=${prod.categoryId}`);
          errors++;
          continue;
        }

        // Формируем правильный subcategoryId
        const correctSubcategoryId = `${categorySlug}-${subcategorySlug}`;

        // Добавляем операцию обновления
        bulkOps.push({
          updateOne: {
            filter: { _id: prod._id },
            update: { $set: { subcategoryId: correctSubcategoryId } }
          }
        });

        updated++;
      }

      // Выполняем батч обновлений
      if (bulkOps.length > 0) {
        await productsCollection.bulkWrite(bulkOps);
        console.log(`✅ Обновлено товаров: ${updated}/${products.length} (батч ${Math.floor(i / batchSize) + 1})`);
      }
    }

    console.log('\n📊 Итоги:');
    console.log(`✅ Обновлено: ${updated}`);
    console.log(`⏭️  Пропущено (уже правильный формат): ${skipped}`);
    console.log(`❌ Ошибок: ${errors}`);
    
    if (debugSamples.length > 0) {
      console.log('\n🔍 Примеры товаров для отладки:');
      debugSamples.forEach((sample, idx) => {
        console.log(`\n  Пример ${idx + 1}:`);
        console.log(`    Товар ID: ${sample.productId}`);
        console.log(`    Категория ID: ${sample.categoryId}, slug: ${sample.categorySlug}`);
        console.log(`    Текущий subcategoryId: ${sample.currentSubcategoryId}`);
        console.log(`    Часть после категории: ${sample.subcategoryPart}`);
        console.log(`    Доступные slug подкатегорий: ${sample.availableSubSlugs.join(', ')}`);
      });
    }
    
    console.log(`\n🎉 Миграция завершена!`);

  } catch (error) {
    console.error('❌ Ошибка при исправлении subcategoryId:', error);
    throw error;
  } finally {
    await closeConnection();
  }
}

// Запускаем скрипт
fixSubcategoryIds()
  .then(() => {
    console.log('\n✅ Скрипт успешно завершен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Скрипт завершился с ошибкой:', error);
    process.exit(1);
  });

