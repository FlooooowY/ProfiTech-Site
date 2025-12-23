const { MongoClient } = require('mongodb');
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

async function checkMongoDB() {
  let client = null;
  
  try {
    const mongoUri = process.env.MONGODB_URI || 
      `mongodb://${process.env.DB_USER || 'admin_db'}:${process.env.DB_PASSWORD || 'admin_db'}@${process.env.DB_HOST || 'localhost'}:27017/${process.env.DB_NAME || 'profitech_db'}?authSource=admin`;
    const dbName = process.env.DB_NAME || 'profitech_db';

    client = new MongoClient(mongoUri);
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db(dbName);

    // Статистика по коллекциям
    console.log('\n📊 Database Statistics:\n');

    const productsCollection = db.collection('products');
    const productsCount = await productsCollection.countDocuments();
    console.log(`Products: ${productsCount}`);

    const categoriesCollection = db.collection('categories');
    const categoriesCount = await categoriesCollection.countDocuments();
    console.log(`Categories: ${categoriesCount}`);

    const subcategoriesCollection = db.collection('subcategories');
    const subcategoriesCount = await subcategoriesCollection.countDocuments();
    console.log(`Subcategories: ${subcategoriesCount}`);

    // Статистика по категориям
    if (productsCount > 0) {
      console.log('\n📦 Products by Category:');
      const categoryStats = await productsCollection.aggregate([
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray();
      categoryStats.forEach(stat => {
        console.log(`   ${stat._id || 'Unknown'}: ${stat.count}`);
      });
    }

    // Топ производителей
    if (productsCount > 0) {
      console.log('\n🏭 Top Manufacturers:');
      const manufacturerStats = await productsCollection.aggregate([
        { $match: { manufacturer: { $exists: true, $ne: '', $ne: 'Не указан' } } },
        { $group: { _id: '$manufacturer', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray();
      manufacturerStats.forEach(stat => {
        console.log(`   ${stat._id}: ${stat.count}`);
      });
    }

    // Проверка индексов
    console.log('\n📇 Indexes:');
    const indexes = await productsCollection.indexes();
    indexes.forEach(index => {
      console.log(`   ${index.name}: ${JSON.stringify(index.key)}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkMongoDB()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Check failed:', error);
    process.exit(1);
  });

