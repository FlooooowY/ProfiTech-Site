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

async function importProducts() {
  let connection;
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'admin_db',
    password: process.env.DB_PASSWORD || 'admin_db',
    database: process.env.DB_NAME || 'profitech_db',
  };

  const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  
  try {
    connection = await pool.getConnection();
    console.log('Connected to MySQL database');

    // Читаем данные из JSON файла
    const productsPath = path.join(process.cwd(), 'public/data/products.json');
    
    if (!fs.existsSync(productsPath)) {
      console.error('Products file not found:', productsPath);
      process.exit(1);
    }

    console.log('Reading products from JSON...');
    const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
    const validProducts = productsData.filter(p => p && p.id);
    
    console.log(`Found ${validProducts.length} products in JSON`);
    
    // Удаляем дубликаты по ID (оставляем последний)
    const uniqueProductsMap = new Map();
    let duplicatesCount = 0;
    
    for (const product of validProducts) {
      if (uniqueProductsMap.has(product.id)) {
        duplicatesCount++;
        // Заменяем на последний найденный (или можно оставить первый - заменить на has)
      }
      uniqueProductsMap.set(product.id, product);
    }
    
    const uniqueProducts = Array.from(uniqueProductsMap.values());
    
    if (duplicatesCount > 0) {
      console.log(`⚠️  Found ${duplicatesCount} duplicate product IDs, keeping unique entries`);
    }
    
    console.log(`Importing ${uniqueProducts.length} unique products`);

    // Проверяем, что категории уже импортированы
    const [categoryCheck] = await connection.query('SELECT COUNT(*) as count FROM categories');
    if (categoryCheck[0].count === 0) {
      console.error('❌ Categories not found! Please run "npm run db:import-categories" first.');
      process.exit(1);
    }

    // Собираем все уникальные подкатегории из товаров
    console.log('Analyzing subcategories...');
    const subcategoryMap = new Map(); // subcategoryId -> { categoryId, name }
    for (const product of uniqueProducts) {
      if (product.subcategoryId && product.categoryId) {
        if (!subcategoryMap.has(product.subcategoryId)) {
          // Извлекаем название подкатегории из ID (например, "бытовая-техника-встраиваемая-техника" -> "Встраиваемая техника")
          const subcategoryName = product.subcategoryId
            .split('-')
            .slice(2) // Пропускаем первые две части (categoryId)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
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
    const existingSubcategories = new Set();
    if (subcategoryMap.size > 0) {
      const subcategoryIds = Array.from(subcategoryMap.keys());
      const placeholders = subcategoryIds.map(() => '?').join(',');
      const [existing] = await connection.query(
        `SELECT id FROM subcategories WHERE id IN (${placeholders})`,
        subcategoryIds
      );
      existing.forEach(row => existingSubcategories.add(row.id));
    }

    // Создаем недостающие подкатегории
    const missingSubcategories = Array.from(subcategoryMap.values())
      .filter(sub => !existingSubcategories.has(sub.id));
    
    if (missingSubcategories.length > 0) {
      console.log(`Creating ${missingSubcategories.length} missing subcategories...`);
      const subcategoryValues = missingSubcategories.map(sub => [
        sub.id,
        sub.categoryId,
        sub.name
      ]);
      
      const insertSubcategoriesSql = `
        INSERT IGNORE INTO subcategories (id, category_id, name)
        VALUES ?
      `;
      await connection.query(insertSubcategoriesSql, [subcategoryValues]);
      console.log(`✓ Created ${missingSubcategories.length} subcategories`);
    }

    // Начинаем транзакцию
    await connection.beginTransaction();

    // Очищаем существующие данные (в правильном порядке из-за внешних ключей)
    console.log('Clearing existing data...');
    await connection.query('DELETE FROM product_characteristics');
    await connection.query('DELETE FROM products');
    console.log('✓ Existing data cleared');

    // Импортируем товары батчами для производительности
    const batchSize = 1000;
    let imported = 0;

    for (let i = 0; i < uniqueProducts.length; i += batchSize) {
      const batch = uniqueProducts.slice(i, i + batchSize);
      
      // Подготавливаем данные для батча
      const productsValues = [];
      const characteristicsValues = [];

      for (const product of batch) {
        // Подготавливаем товар
        productsValues.push([
          product.id,
          product.name,
          product.description || '',
          product.categoryId,
          product.subcategoryId || null,
          product.manufacturer || 'Не указан',
          JSON.stringify(product.images || [])
        ]);

        // Подготавливаем характеристики
        if (product.characteristics && Array.isArray(product.characteristics)) {
          for (const char of product.characteristics) {
            if (char && char.name && char.value) {
              characteristicsValues.push([
                product.id,
                char.name,
                char.value
              ]);
            }
          }
        }
      }

      // Вставляем товары (используем INSERT IGNORE для пропуска дубликатов на случай, если они все же есть)
      if (productsValues.length > 0) {
        const productsSql = `
          INSERT IGNORE INTO products (id, name, description, category_id, subcategory_id, manufacturer, images)
          VALUES ?
        `;
        await connection.query(productsSql, [productsValues]);
        imported += productsValues.length;
        console.log(`✓ Imported ${imported}/${uniqueProducts.length} products`);
      }

      // Вставляем характеристики батчами
      if (characteristicsValues.length > 0) {
        const charBatchSize = 5000;
        for (let j = 0; j < characteristicsValues.length; j += charBatchSize) {
          const charBatch = characteristicsValues.slice(j, j + charBatchSize);
          const characteristicsSql = `
            INSERT INTO product_characteristics (product_id, name, value)
            VALUES ?
          `;
          await connection.query(characteristicsSql, [charBatch]);
        }
        console.log(`✓ Imported ${characteristicsValues.length} characteristics`);
      }
    }

    // Коммитим транзакцию
    await connection.commit();
    console.log('\n✅ All products imported successfully!');

    // Получаем статистику
    const [productCount] = await connection.query('SELECT COUNT(*) as count FROM products');
    const [charCount] = await connection.query('SELECT COUNT(*) as count FROM product_characteristics');
    
    console.log(`\n📊 Statistics:`);
    console.log(`   Products: ${productCount[0].count}`);
    console.log(`   Characteristics: ${charCount[0].count}`);

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error importing products:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
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

