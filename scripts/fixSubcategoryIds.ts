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
        
        if (currentSubcategoryId.startsWith(expectedPrefix)) {
          // Уже правильный формат
          skipped++;
          continue;
        }

        // Пытаемся найти подкатегорию
        let subcategorySlug = null;
        
        // Вариант 1: subcategoryId это ID подкатегории (например, "1-3")
        const subcategoryInfo = subcategoryMap.get(currentSubcategoryId);
        if (subcategoryInfo) {
          subcategorySlug = subcategoryInfo.slug;
        } else {
          // Вариант 2: subcategoryId это уже slug (например, "elektromehanicheskoe")
          // Проверяем, есть ли такой slug в подкатегориях
          const subBySlug = subcategories.find((sub: any) => 
            (sub.slug === currentSubcategoryId || sub._id === currentSubcategoryId) &&
            sub.categoryId === prod.categoryId
          );
          
          if (subBySlug) {
            subcategorySlug = (subBySlug as any).slug || (subBySlug as any)._id;
          } else {
            // Вариант 3: subcategoryId уже в формате category-subcategory, но с другой категорией
            // Извлекаем slug из конца
            const parts = currentSubcategoryId.split('-');
            if (parts.length > 1) {
              // Возможно, это уже правильный формат, но с другим slug категории
              // Пробуем найти подкатегорию по последним частям
              const possibleSubSlug = parts.slice(1).join('-');
              const subByPartialSlug = subcategories.find((sub: any) => 
                (sub.slug === possibleSubSlug || sub._id === possibleSubSlug) &&
                sub.categoryId === prod.categoryId
              );
              
              if (subByPartialSlug) {
                subcategorySlug = (subByPartialSlug as any).slug || (subByPartialSlug as any)._id;
              }
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

