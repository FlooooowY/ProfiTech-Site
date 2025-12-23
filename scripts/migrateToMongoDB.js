const { MongoClient } = require('mongodb');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Загружаем переменные окружения из .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

async function migrateToMongoDB() {
  let mysqlConnection = null;
  let mongoClient = null;
  
  try {
    // Подключение к MySQL
    const mysqlConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'admin_db',
      password: process.env.DB_PASSWORD || 'admin_db',
      database: process.env.DB_NAME || 'profitech_db',
    };

    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log('✓ Connected to MySQL');

    // Подключение к MongoDB
    const mongoUri = process.env.MONGODB_URI || 
      `mongodb://${process.env.DB_USER || 'admin_db'}:${process.env.DB_PASSWORD || 'admin_db'}@${process.env.DB_HOST || 'localhost'}:27017/${process.env.DB_NAME || 'profitech_db'}?authSource=admin`;
    const dbName = process.env.DB_NAME || 'profitech_db';

    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    console.log('✓ Connected to MongoDB');

    const db = mongoClient.db(dbName);

    // Миграция categories
    console.log('\n📦 Migrating categories...');
    const [categories] = await mysqlConnection.query('SELECT * FROM categories');
    if (categories.length > 0) {
      const categoriesCollection = db.collection('categories');
      await categoriesCollection.deleteMany({});
      const categoriesDocs = categories.map(cat => ({
        _id: cat.id,
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        createdAt: cat.created_at,
        updatedAt: cat.updated_at
      }));
      await categoriesCollection.insertMany(categoriesDocs);
      console.log(`✓ Migrated ${categories.length} categories`);
    }

    // Миграция subcategories
    console.log('\n📦 Migrating subcategories...');
    const [subcategories] = await mysqlConnection.query('SELECT * FROM subcategories');
    if (subcategories.length > 0) {
      const subcategoriesCollection = db.collection('subcategories');
      await subcategoriesCollection.deleteMany({});
      const subcategoriesDocs = subcategories.map(sub => ({
        _id: sub.id,
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        categoryId: sub.category_id,
        createdAt: sub.created_at,
        updatedAt: sub.updated_at
      }));
      await subcategoriesCollection.insertMany(subcategoriesDocs);
      console.log(`✓ Migrated ${subcategories.length} subcategories`);
    }

    // Миграция products
    console.log('\n📦 Migrating products...');
    const [products] = await mysqlConnection.query('SELECT * FROM products LIMIT 1000000'); // Ограничение на случай больших таблиц
    if (products.length > 0) {
      const productsCollection = db.collection('products');
      await productsCollection.deleteMany({});
      
      // Получаем характеристики для всех товаров
      const productIds = products.map(p => p.id);
      const placeholders = productIds.map(() => '?').join(',');
      const [characteristics] = await mysqlConnection.query(
        `SELECT product_id, name, value FROM product_characteristics WHERE product_id IN (${placeholders})`,
        productIds
      );

      // Группируем характеристики по product_id
      const characteristicsMap = new Map();
      characteristics.forEach(char => {
        if (!characteristicsMap.has(char.product_id)) {
          characteristicsMap.set(char.product_id, []);
        }
        characteristicsMap.get(char.product_id).push({
          name: char.name,
          value: char.value
        });
      });

      // Формируем документы для MongoDB
      const productsDocs = products.map(product => {
        let images = [];
        if (product.images) {
          try {
            images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
            if (!Array.isArray(images)) images = [];
          } catch (e) {
            images = [];
          }
        }

        return {
          _id: product.id,
          id: product.id,
          name: product.name,
          description: product.description || '',
          categoryId: product.category_id,
          subcategoryId: product.subcategory_id || null,
          manufacturer: product.manufacturer || 'Не указан',
          characteristics: characteristicsMap.get(product.id) || [],
          images: images,
          createdAt: product.created_at || new Date(),
          updatedAt: product.updated_at || new Date()
        };
      });

      // Вставляем батчами по 1000 для производительности
      const batchSize = 1000;
      for (let i = 0; i < productsDocs.length; i += batchSize) {
        const batch = productsDocs.slice(i, i + batchSize);
        await productsCollection.insertMany(batch);
        console.log(`  ✓ Migrated ${Math.min(i + batchSize, productsDocs.length)}/${productsDocs.length} products`);
      }
      console.log(`✓ Migrated ${products.length} products`);
    }

    // Создаем индексы
    console.log('\n📊 Creating indexes...');
    const productsCollection = db.collection('products');
    await productsCollection.createIndexes([
      { key: { categoryId: 1 } },
      { key: { subcategoryId: 1 } },
      { key: { manufacturer: 1 } },
      { key: { categoryId: 1, subcategoryId: 1 } },
      { key: { categoryId: 1, manufacturer: 1 } },
      { key: { subcategoryId: 1, manufacturer: 1 } },
      { key: { name: 'text', description: 'text', manufacturer: 'text' } },
      { key: { createdAt: 1, _id: 1 } },
    ]);
    console.log('✓ Indexes created for products');

    const subcategoriesCollection = db.collection('subcategories');
    await subcategoriesCollection.createIndexes([
      { key: { categoryId: 1 } },
      { key: { slug: 1 } },
    ]);
    console.log('✓ Indexes created for subcategories');

    const categoriesCollection = db.collection('categories');
    await categoriesCollection.createIndexes([
      { key: { slug: 1 }, unique: true },
    ]);
    console.log('✓ Indexes created for categories');

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

migrateToMongoDB()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

