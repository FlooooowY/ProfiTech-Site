const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'admin_db',
  password: process.env.DB_PASSWORD || 'admin_db',
  database: process.env.DB_NAME || 'profitech_db',
};

async function checkDatabase() {
  let connection;
  
  try {
    console.log('🔍 Подключение к базе данных...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Подключено к базе данных\n');

    // Проверка таблиц
    console.log('📊 СТАТИСТИКА БАЗЫ ДАННЫХ:\n');
    console.log('═'.repeat(60));

    // 1. Количество товаров
    const [productsResult] = await connection.execute('SELECT COUNT(*) as count FROM products');
    const productCount = productsResult[0].count;
    console.log(`📦 Товаров в базе: ${productCount.toLocaleString()}`);

    // 2. Количество категорий
    const [categoriesResult] = await connection.execute('SELECT COUNT(*) as count FROM categories');
    const categoryCount = categoriesResult[0].count;
    console.log(`📁 Категорий: ${categoryCount}`);

    // 3. Количество подкатегорий
    const [subcategoriesResult] = await connection.execute('SELECT COUNT(*) as count FROM subcategories');
    const subcategoryCount = subcategoriesResult[0].count;
    console.log(`📂 Подкатегорий: ${subcategoryCount}`);

    // 4. Количество характеристик
    const [characteristicsResult] = await connection.execute('SELECT COUNT(*) as count FROM product_characteristics');
    const characteristicsCount = characteristicsResult[0].count;
    console.log(`🔧 Характеристик: ${characteristicsCount.toLocaleString()}`);

    // 5. Количество изображений (из JSON поля в products)
    let imagesCount = 0;
    try {
      const [imagesResult] = await connection.execute(`
        SELECT SUM(JSON_LENGTH(images)) as total 
        FROM products 
        WHERE images IS NOT NULL AND images != '[]' AND images != 'null'
      `);
      imagesCount = imagesResult[0].total || 0;
    } catch (error) {
      // Если ошибка, просто пропускаем
      imagesCount = 0;
    }
    console.log(`🖼️  Изображений: ${imagesCount.toLocaleString()}`);

    console.log('\n' + '═'.repeat(60));
    console.log('\n📈 СТАТИСТИКА ПО КАТЕГОРИЯМ:\n');

    // Статистика по категориям
    const [categoryStats] = await connection.execute(`
      SELECT 
        c.name as category_name,
        COUNT(DISTINCT p.id) as products_count,
        COUNT(DISTINCT p.subcategory_id) as subcategories_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id, c.name
      ORDER BY products_count DESC
    `);

    categoryStats.forEach((stat) => {
      console.log(`  ${stat.category_name}:`);
      console.log(`    └─ Товаров: ${stat.products_count.toLocaleString()}`);
      console.log(`    └─ Подкатегорий: ${stat.subcategories_count}`);
      console.log('');
    });

    console.log('═'.repeat(60));
    console.log('\n📊 СТАТИСТИКА ПО ПРОИЗВОДИТЕЛЯМ (ТОП-10):\n');

    // Топ производителей
    const [manufacturersStats] = await connection.execute(`
      SELECT 
        manufacturer,
        COUNT(*) as products_count
      FROM products
      WHERE manufacturer IS NOT NULL 
        AND manufacturer != ''
        AND manufacturer != 'Не указан'
      GROUP BY manufacturer
      ORDER BY products_count DESC
      LIMIT 10
    `);

    manufacturersStats.forEach((stat, index) => {
      console.log(`  ${index + 1}. ${stat.manufacturer}: ${stat.products_count.toLocaleString()} товаров`);
    });

    console.log('\n' + '═'.repeat(60));
    console.log('\n🔍 ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ:\n');

    // Проверка товаров без категории
    const [noCategory] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE category_id IS NULL
    `);
    if (noCategory[0].count > 0) {
      console.log(`⚠️  Товаров без категории: ${noCategory[0].count}`);
    } else {
      console.log('✅ Все товары имеют категорию');
    }

    // Проверка товаров без подкатегории
    const [noSubcategory] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE subcategory_id IS NULL
    `);
    if (noSubcategory[0].count > 0) {
      console.log(`⚠️  Товаров без подкатегории: ${noSubcategory[0].count}`);
    } else {
      console.log('✅ Все товары имеют подкатегорию');
    }

    // Проверка товаров без изображений
    const [noImages] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM products
      WHERE images IS NULL 
         OR images = '[]' 
         OR images = 'null'
         OR JSON_LENGTH(images) = 0
    `);
    if (noImages[0].count > 0) {
      console.log(`⚠️  Товаров без изображений: ${noImages[0].count}`);
    } else {
      console.log('✅ Все товары имеют изображения');
    }

    // Проверка товаров без характеристик
    const [noCharacteristics] = await connection.execute(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM products p
      LEFT JOIN product_characteristics pc ON p.id = pc.product_id
      WHERE pc.id IS NULL
    `);
    if (noCharacteristics[0].count > 0) {
      console.log(`⚠️  Товаров без характеристик: ${noCharacteristics[0].count}`);
    } else {
      console.log('✅ Все товары имеют характеристики');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Проверка завершена!\n');

  } catch (error) {
    console.error('❌ Ошибка при проверке базы данных:');
    if (error instanceof Error) {
      console.error('   Сообщение:', error.message);
      if (error.code) {
        console.error('   Код:', error.code);
      }
    } else {
      console.error('   Ошибка:', error);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Запускаем проверку
checkDatabase();

