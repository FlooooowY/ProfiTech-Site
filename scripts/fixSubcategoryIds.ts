/**
 * Скрипт для исправления формата subcategoryId во всех товарах
 * Приводит subcategoryId к единому формату: ${categorySlug}-${subcategorySlug}
 */

import { getCollection, closeConnection } from '../lib/db';
import { CATEGORIES } from '../constants/categories';

async function fixSubcategoryIds() {
  try {
    console.log('🔧 Начинаем исправление subcategoryId...\n');

    const productsCollection = await getCollection('products');

    // Используем константы из кода для правильного маппинга
    const categoryMap = new Map<string, string>(); // categoryId -> categorySlug
    const subcategoryMap = new Map<string, { slug: string; categoryId: string; name: string }>(); // subcategoryId -> { slug, categoryId, name }
    
    // Заполняем мапы из констант
    CATEGORIES.forEach(category => {
      categoryMap.set(category.id, category.slug);
      
      category.subcategories?.forEach(subcategory => {
        subcategoryMap.set(subcategory.id, {
          slug: subcategory.slug,
          categoryId: subcategory.categoryId,
          name: subcategory.name
        });
      });
    });

    // Также получаем данные из MongoDB для обратной совместимости
    const categoriesCollection = await getCollection('categories');
    const subcategoriesCollection = await getCollection('subcategories');
    const categories = await categoriesCollection.find({}).toArray();
    const subcategories = await subcategoriesCollection.find({}).toArray();

    // Дополняем мапы данными из MongoDB (если их нет в константах)
    categories.forEach((cat: any) => {
      if (!categoryMap.has(cat._id)) {
        categoryMap.set(cat._id, cat.slug || cat._id);
      }
      if (cat.id && !categoryMap.has(cat.id)) {
        categoryMap.set(cat.id, cat.slug || cat._id);
      }
    });

    subcategories.forEach((sub: any) => {
      if (!subcategoryMap.has(sub._id)) {
        subcategoryMap.set(sub._id, {
          slug: sub.slug || sub._id,
          categoryId: sub.categoryId,
          name: sub.name || ''
        });
      }
      if (sub.id && !subcategoryMap.has(sub.id)) {
        subcategoryMap.set(sub.id, {
          slug: sub.slug || sub._id,
          categoryId: sub.categoryId,
          name: sub.name || ''
        });
      }
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
        // Правильный формат: ${categorySlug}-${subcategorySlug} (латиница из констант)
        const expectedPrefix = `${categorySlug}-`;
        
        // Проверяем, начинается ли с правильного префикса категории (латиница)
        let needsUpdate = true;
        if (currentSubcategoryId.startsWith(expectedPrefix)) {
          // Извлекаем часть после категории
          const subcategoryPart = currentSubcategoryId.substring(expectedPrefix.length);
          
          // Проверяем, совпадает ли эта часть ТОЧНО с каким-либо slug подкатегории из КОНСТАНТ
          const categoryFromConstants = CATEGORIES.find(cat => cat.id === prod.categoryId);
          const matchingSubFromConstants = categoryFromConstants?.subcategories?.find(
            sub => sub.slug === subcategoryPart
          );
          
          if (matchingSubFromConstants) {
            // Уже правильный формат - ТОЧНО совпадает со slug из констант (латиница)
            needsUpdate = false;
          }
        }
        
        if (!needsUpdate) {
          skipped++;
          continue;
        }

        // Пытаемся найти подкатегорию в MongoDB
        // Цель: найти subcategory в MongoDB, получить её _id (например, "2-2"), 
        // затем найти этот _id в константах и взять латинский slug
        
        let foundSubcategoryId: string | null = null; // ID подкатегории (например, "2-2")
        
        // Вариант 1: subcategoryId это уже ID подкатегории (например, "1-3")
        // Проверяем, есть ли такая подкатегория в MongoDB
        const subById = subcategories.find((sub: any) => 
          (sub._id === currentSubcategoryId || sub.id === currentSubcategoryId) &&
          sub.categoryId === prod.categoryId
        );
        if (subById) {
          foundSubcategoryId = (subById as any)._id || (subById as any).id;
        }
        
        // Вариант 2: subcategoryId в формате category-subcategory (может быть кириллица или латиница)
        if (!foundSubcategoryId) {
          const parts = currentSubcategoryId.split('-');
          if (parts.length > 1) {
            // Пробуем найти подкатегорию по slug (часть после категории)
            const subcategoryPart = parts.slice(1).join('-');
            
            const subBySlug = subcategories.find((sub: any) => 
              sub.categoryId === prod.categoryId &&
              (sub.slug === subcategoryPart || 
               sub._id === subcategoryPart ||
               sub.slug === currentSubcategoryId ||
               sub._id === currentSubcategoryId)
            );
            
            if (subBySlug) {
              foundSubcategoryId = (subBySlug as any)._id || (subBySlug as any).id;
            }
          }
        }
        
        // Вариант 3: subcategoryId это просто slug без категории
        if (!foundSubcategoryId) {
          const subByDirectSlug = subcategories.find((sub: any) => 
            sub.categoryId === prod.categoryId &&
            (sub.slug === currentSubcategoryId || sub._id === currentSubcategoryId)
          );
          
          if (subByDirectSlug) {
            foundSubcategoryId = (subByDirectSlug as any)._id || (subByDirectSlug as any).id;
          }
        }
        
        // Вариант 4: Пробуем найти по названию (нормализация)
        if (!foundSubcategoryId) {
          const normalizedCurrent = currentSubcategoryId.toLowerCase().replace(/-/g, '').replace(/\s+/g, '');
          
          const subByName = subcategories.find((sub: any) => {
            if (sub.categoryId !== prod.categoryId) return false;
            
            const subSlug = (sub.slug || '').toLowerCase().replace(/-/g, '');
            const subName = (sub.name || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-zа-яё0-9]/gi, '');
            const subId = (sub._id || '').toLowerCase();
            
            return subSlug === normalizedCurrent ||
                   subName === normalizedCurrent ||
                   subId === normalizedCurrent ||
                   normalizedCurrent.includes(subSlug) ||
                   subSlug.includes(normalizedCurrent);
          });
          
          if (subByName) {
            foundSubcategoryId = (subByName as any)._id || (subByName as any).id;
          }
        }

        if (!foundSubcategoryId) {
          console.warn(`⚠️  Не удалось найти подкатегорию для товара ${prod._id}: subcategoryId=${currentSubcategoryId}, categoryId=${prod.categoryId}`);
          errors++;
          continue;
        }

        // Теперь ищем латинский slug из констант по найденному ID
        const subcategoryInfo = subcategoryMap.get(foundSubcategoryId);
        if (!subcategoryInfo || subcategoryInfo.categoryId !== prod.categoryId) {
          console.warn(`⚠️  Подкатегория ${foundSubcategoryId} не найдена в константах для категории ${prod.categoryId}`);
          errors++;
          continue;
        }

        const subcategorySlug = subcategoryInfo.slug; // Латинский slug из констант

        // Формируем правильный subcategoryId (латинский формат)
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

