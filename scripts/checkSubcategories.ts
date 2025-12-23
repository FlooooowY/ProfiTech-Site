/**
 * Скрипт для проверки формата subcategoryId в товарах и subcategories
 */

import { getCollection, closeConnection } from '../lib/db';

async function checkSubcategories() {
  try {
    console.log('🔍 Проверяем формат subcategoryId...\n');

    const productsCollection = await getCollection('products');
    const subcategoriesCollection = await getCollection('subcategories');
    const categoriesCollection = await getCollection('categories');

    // Получаем несколько примеров товаров
    const sampleProducts = await productsCollection
      .find({ subcategoryId: { $exists: true } })
      .limit(10)
      .toArray();

    console.log('📦 Примеры товаров:');
    for (const product of sampleProducts) {
      const prod: any = product;
      console.log(`\n  Товар ID: ${prod._id}`);
      console.log(`    categoryId: ${prod.categoryId}`);
      console.log(`    subcategoryId: ${prod.subcategoryId}`);
      
      // Получаем категорию
      const category = await categoriesCollection.findOne({ _id: prod.categoryId } as any);
      const categorySlug = (category as any)?.slug || (category as any)?._id;
      console.log(`    categorySlug: ${categorySlug}`);
      
      // Извлекаем часть после категории
      if (prod.subcategoryId && categorySlug) {
        const expectedPrefix = `${categorySlug}-`;
        if (prod.subcategoryId.startsWith(expectedPrefix)) {
          const subcategoryPart = prod.subcategoryId.substring(expectedPrefix.length);
          console.log(`    subcategoryPart: ${subcategoryPart}`);
          
          // Ищем подкатегорию
          const subcategory = await subcategoriesCollection.findOne({
            categoryId: prod.categoryId,
            $or: [
              { slug: subcategoryPart },
              { _id: subcategoryPart }
            ]
          } as any);
          
          if (subcategory) {
            const sub: any = subcategory;
            console.log(`    ✅ Найдена подкатегория:`);
            console.log(`       _id: ${sub._id}`);
            console.log(`       slug: ${sub.slug}`);
            console.log(`       name: ${sub.name}`);
          } else {
            console.log(`    ❌ Подкатегория не найдена!`);
            
            // Показываем все подкатегории этой категории
            const allSubs = await subcategoriesCollection
              .find({ categoryId: prod.categoryId })
              .limit(5)
              .toArray();
            console.log(`    Доступные подкатегории (первые 5):`);
            allSubs.forEach((sub: any) => {
              console.log(`      - _id: ${sub._id}, slug: ${sub.slug}, name: ${sub.name}`);
            });
          }
        }
      }
    }

    // Проверяем формат подкатегорий
    console.log('\n\n📋 Примеры подкатегорий из коллекции:');
    const sampleSubs = await subcategoriesCollection
      .find({})
      .limit(10)
      .toArray();
    
    for (const sub of sampleSubs) {
      const subcat: any = sub;
      console.log(`\n  Подкатегория:`);
      console.log(`    _id: ${subcat._id}`);
      console.log(`    slug: ${subcat.slug}`);
      console.log(`    name: ${subcat.name}`);
      console.log(`    categoryId: ${subcat.categoryId}`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  } finally {
    await closeConnection();
  }
}

checkSubcategories()
  .then(() => {
    console.log('\n✅ Проверка завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
  });

