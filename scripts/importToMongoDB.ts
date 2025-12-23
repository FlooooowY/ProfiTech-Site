import { getCollection } from '../lib/db';
import fs from 'fs';
import path from 'path';
import { Product } from '@/types';

async function importProducts() {
  try {
    console.log('Connected to MongoDB');

    // Читаем данные из JSON файла
    const productsPath = path.join(process.cwd(), 'public/data/products.json');
    
    if (!fs.existsSync(productsPath)) {
      console.error('Products file not found:', productsPath);
      process.exit(1);
    }

    console.log('Reading products from JSON...');
    const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf-8')) as Product[];
    
    // Фильтруем дубликаты по ID, оставляя последний
    const uniqueProductsMap = new Map();
    productsData.forEach(p => {
      if (p && p.id) {
        uniqueProductsMap.set(p.id, p);
      }
    });
    const validProducts = Array.from(uniqueProductsMap.values());
    
    const duplicateCount = productsData.length - validProducts.length;
    if (duplicateCount > 0) {
      console.log(`⚠️ Найдено и удалено ${duplicateCount} дубликатов товаров по ID.`);
    }

    console.log(`Found ${validProducts.length} unique products to import`);

    // Проверяем, что категории уже импортированы
    const categoriesCollection = await getCollection('categories');
    const categoriesCount = await categoriesCollection.countDocuments();
    if (categoriesCount === 0) {
      console.error('❌ Categories not found! Please run "npm run db:import-categories" first.');
      process.exit(1);
    }

    // Собираем все уникальные подкатегории из товаров
    console.log('Analyzing subcategories...');
    const subcategoryMap = new Map(); // subcategoryId -> { categoryId, name }
    for (const product of validProducts) {
      if (product.subcategoryId && product.categoryId) {
        if (!subcategoryMap.has(product.subcategoryId)) {
          // Извлекаем название подкатегории из ID (например, "бытовая-техника-встраиваемая-техника" -> "Встраиваемая техника")
          const subcategoryName = product.subcategoryId
            .split('-')
            .slice(2) // Пропускаем первые две части (categoryId)
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          subcategoryMap.set(product.subcategoryId, {
            id: product.subcategoryId,
            categoryId: product.categoryId,
            name: subcategoryName || product.subcategoryId
          });
        }
      }
    }

    console.log(`Found ${subcategoryMap.size} unique subcategories in products`);

    // Проверяем, какие подкатегории уже существуют
    const subcategoriesCollection = await getCollection('subcategories');
    const existingSubcategories = new Set();
    if (subcategoryMap.size > 0) {
      const subcategoryIds = Array.from(subcategoryMap.keys());
      const existing = await subcategoriesCollection
        .find({ _id: { $in: subcategoryIds } } as any)
        .toArray();
      existing.forEach((doc: any) => existingSubcategories.add(doc._id || doc.id));
    }

    // Создаем недостающие подкатегории
    const missingSubcategories = Array.from(subcategoryMap.values()).filter(
      sub => !existingSubcategories.has(sub.id)
    );

    if (missingSubcategories.length > 0) {
      console.log(`Creating ${missingSubcategories.length} missing subcategories...`);
      const subcategoryDocs = missingSubcategories.map(sub => ({
        _id: sub.id,
        id: sub.id,
        name: sub.name,
        slug: sub.id.split('-').slice(2).join('-'),
        categoryId: sub.categoryId,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      await subcategoriesCollection.insertMany(subcategoryDocs as any);
      console.log(`✓ Created ${missingSubcategories.length} subcategories`);
    } else {
      console.log('No missing subcategories to create.');
    }

    // Очищаем существующие данные
    console.log('Clearing existing data...');
    const productsCollection = await getCollection('products');
    await productsCollection.deleteMany({});
    console.log('✓ Existing data cleared');

    // Импортируем товары батчами для производительности
    const batchSize = 1000;
    let imported = 0;

    for (let i = 0; i < validProducts.length; i += batchSize) {
      const batch = validProducts.slice(i, i + batchSize);
      
      // Подготавливаем данные для батча
      const productsDocs = batch.map(product => {
        return {
          _id: product.id,
          id: product.id,
          name: product.name,
          description: product.description || '',
          categoryId: product.categoryId,
          subcategoryId: product.subcategoryId || null,
          manufacturer: product.manufacturer || 'Не указан',
          characteristics: product.characteristics || [],
          images: Array.isArray(product.images) ? product.images : [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });

      // Вставляем товары
      if (productsDocs.length > 0) {
        await productsCollection.insertMany(productsDocs as any);
        imported += productsDocs.length;
        console.log(`✓ Imported ${imported}/${validProducts.length} products`);
      }
    }

    console.log('\n✅ All products imported successfully!');

    // Получаем статистику
    const productCount = await productsCollection.countDocuments();
    const characteristicsCount = validProducts.reduce((sum, p) => sum + (p.characteristics?.length || 0), 0);
    
    console.log(`\n📊 Statistics:`);
    console.log(`   Products: ${productCount}`);
    console.log(`   Characteristics: ${characteristicsCount}`);

  } catch (error) {
    console.error('Error importing products:', error);
    throw error;
  }
}

importProducts()
  .then(() => {
    console.log('Import completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });

