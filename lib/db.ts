import { MongoClient, Db, Collection, Document } from 'mongodb';

// Конфигурация подключения к MongoDB
const uri = process.env.MONGODB_URI || 
  `mongodb://${process.env.DB_USER || 'admin_db'}:${process.env.DB_PASSWORD || 'admin_db'}@${process.env.DB_HOST || 'localhost'}:27017/${process.env.DB_NAME || 'profitech_db'}?authSource=admin`;

const dbName = process.env.DB_NAME || 'profitech_db';

// Глобальный клиент MongoDB (переиспользуется между запросами)
let client: MongoClient | null = null;
let db: Db | null = null;

// Подключение к MongoDB
async function connect() {
  if (client && db) {
    return { client, db };
  }

  try {
    client = new MongoClient(uri, {
      maxPoolSize: 20, // Максимальное количество соединений в пуле
      minPoolSize: 5, // Минимальное количество соединений
      maxIdleTimeMS: 30000, // Закрывать неиспользуемые соединения через 30 секунд
      serverSelectionTimeoutMS: 5000, // Таймаут выбора сервера
      socketTimeoutMS: 45000, // Таймаут сокета
    });

    await client.connect();
    db = client.db(dbName);
    
    console.log('[MongoDB] Connected successfully');
    return { client, db };
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    throw error;
  }
}

// Получить базу данных
export async function getDb(): Promise<Db> {
  if (!db) {
    await connect();
  }
  return db!;
}

// Получить коллекцию
export async function getCollection<T extends Document = Document>(name: string): Promise<Collection<T>> {
  const database = await getDb();
  return database.collection<T>(name);
}

// Закрыть соединение (для завершения работы приложения)
export async function closeConnection() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[MongoDB] Connection closed');
  }
}

// Проверка подключения
export async function testConnection(): Promise<boolean> {
  try {
    const database = await getDb();
    await database.admin().ping();
    return true;
  } catch (error) {
    console.error('[MongoDB] Connection test failed:', error);
    return false;
  }
}

// Создать индексы для оптимизации запросов
export async function createIndexes() {
  try {
    const database = await getDb();
    
    // Индексы для products
    const productsCollection = database.collection('products');
    await productsCollection.createIndexes([
      { key: { categoryId: 1 } },
      { key: { subcategoryId: 1 } },
      { key: { manufacturer: 1 } },
      { key: { categoryId: 1, subcategoryId: 1 } },
      { key: { categoryId: 1, manufacturer: 1 } },
      { key: { subcategoryId: 1, manufacturer: 1 } },
      { key: { name: 'text', description: 'text', manufacturer: 'text' } }, // Текстовый индекс для поиска
      { key: { createdAt: 1, _id: 1 } }, // Для сортировки и пагинации
    ]);
    console.log('[MongoDB] Indexes created for products');
    
    // Индексы для product_characteristics (если храним отдельно)
    const characteristicsCollection = database.collection('product_characteristics');
    await characteristicsCollection.createIndexes([
      { key: { productId: 1 } },
      { key: { name: 1 } },
      { key: { name: 1, value: 1 } },
      { key: { productId: 1, name: 1 } },
    ]);
    console.log('[MongoDB] Indexes created for product_characteristics');
    
    // Индексы для categories
    const categoriesCollection = database.collection('categories');
    await categoriesCollection.createIndexes([
      { key: { slug: 1 }, unique: true },
    ]);
    console.log('[MongoDB] Indexes created for categories');
    
    // Индексы для subcategories
    const subcategoriesCollection = database.collection('subcategories');
    await subcategoriesCollection.createIndexes([
      { key: { categoryId: 1 } },
      { key: { slug: 1 } },
    ]);
    console.log('[MongoDB] Indexes created for subcategories');
    
  } catch (error) {
    console.error('[MongoDB] Error creating indexes:', error);
    throw error;
  }
}

export default { getDb, getCollection, closeConnection, testConnection, createIndexes };
