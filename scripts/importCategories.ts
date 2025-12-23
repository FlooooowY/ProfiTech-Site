import { getCollection } from '../lib/db';
import { CATEGORIES } from '@/constants/categories';

async function importCategories() {
  try {
    console.log('Connected to MongoDB');

    const categoriesCollection = await getCollection('categories');
    const subcategoriesCollection = await getCollection('subcategories');

    // Очищаем существующие данные
    console.log('Clearing existing data...');
    await subcategoriesCollection.deleteMany({});
    await categoriesCollection.deleteMany({});
    console.log('✓ Existing data cleared');

    // Импортируем категории
    console.log('Importing categories...');
    const categoriesDocs = CATEGORIES.map(cat => ({
      _id: cat.id,
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || null,
      description: cat.description || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    if (categoriesDocs.length > 0) {
      await categoriesCollection.insertMany(categoriesDocs as any);
      console.log(`✓ Imported ${categoriesDocs.length} categories`);
    }

    // Импортируем подкатегории
    console.log('Importing subcategories...');
    const subcategoriesDocs: any[] = [];
    
    CATEGORIES.forEach(category => {
      if (category.subcategories && category.subcategories.length > 0) {
        category.subcategories.forEach(sub => {
          subcategoriesDocs.push({
            _id: sub.id,
            id: sub.id,
            name: sub.name,
            slug: sub.slug || sub.id,
            categoryId: category.id,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });
      }
    });

    if (subcategoriesDocs.length > 0) {
      await subcategoriesCollection.insertMany(subcategoriesDocs as any);
      console.log(`✓ Imported ${subcategoriesDocs.length} subcategories`);
    }

    console.log('\n✅ All categories and subcategories imported successfully!');
    
    // Статистика
    const categoriesCount = await categoriesCollection.countDocuments();
    const subcategoriesCount = await subcategoriesCollection.countDocuments();
    
    console.log(`\n📊 Statistics:`);
    console.log(`   Categories: ${categoriesCount}`);
    console.log(`   Subcategories: ${subcategoriesCount}`);

  } catch (error) {
    console.error('Error importing categories:', error);
    throw error;
  }
}

importCategories()
  .then(() => {
    console.log('Import completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
