const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function importProducts() {
  let connection;
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'u3364352_default',
    password: process.env.DB_PASSWORD || 'nDpDE4luD7G84uk3',
    database: process.env.DB_NAME || 'u3364352_default',
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
    
    console.log(`Found ${validProducts.length} products to import`);

    // Проверяем, что категории уже импортированы
    const [categoryCheck] = await connection.query('SELECT COUNT(*) as count FROM categories');
    if (categoryCheck[0].count === 0) {
      console.error('❌ Categories not found! Please run "npm run db:import-categories" first.');
      process.exit(1);
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

    for (let i = 0; i < validProducts.length; i += batchSize) {
      const batch = validProducts.slice(i, i + batchSize);
      
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

      // Вставляем товары
      if (productsValues.length > 0) {
        const productsSql = `
          INSERT INTO products (id, name, description, category_id, subcategory_id, manufacturer, images)
          VALUES ?
        `;
        await connection.query(productsSql, [productsValues]);
        imported += productsValues.length;
        console.log(`✓ Imported ${imported}/${validProducts.length} products`);
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

