const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Импортируем категории из constants/categories.ts
// Так как это JS файл, нужно прочитать и распарсить TS файл или создать JSON версию
// Для простоты создадим данные напрямую
const CATEGORIES = require('../constants/categories.json');

async function importCategories() {
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

    // Начинаем транзакцию
    await connection.beginTransaction();

    // Очищаем существующие данные (в правильном порядке из-за внешних ключей)
    console.log('Clearing existing data...');
    await connection.query('DELETE FROM product_characteristics');
    await connection.query('DELETE FROM products');
    await connection.query('DELETE FROM subcategories');
    await connection.query('DELETE FROM categories');
    console.log('✓ Existing data cleared');

    // Импортируем категории
    console.log('Importing categories...');
    const categoriesValues = CATEGORIES.map(cat => [
      cat.id,
      cat.name,
      cat.slug,
      cat.icon || null,
      cat.description || null
    ]);

    if (categoriesValues.length > 0) {
      const categoriesSql = `
        INSERT INTO categories (id, name, slug, icon, description)
        VALUES ?
      `;
      await connection.query(categoriesSql, [categoriesValues]);
      console.log(`✓ Imported ${categoriesValues.length} categories`);
    }

    // Импортируем подкатегории
    console.log('Importing subcategories...');
    const subcategoriesValues = [];
    
    for (const category of CATEGORIES) {
      if (category.subcategories && category.subcategories.length > 0) {
        for (const subcat of category.subcategories) {
          subcategoriesValues.push([
            subcat.id,
            subcat.name,
            subcat.slug,
            category.id
          ]);
        }
      }
    }

    if (subcategoriesValues.length > 0) {
      const subcategoriesSql = `
        INSERT INTO subcategories (id, name, slug, category_id)
        VALUES ?
      `;
      await connection.query(subcategoriesSql, [subcategoriesValues]);
      console.log(`✓ Imported ${subcategoriesValues.length} subcategories`);
    }

    // Коммитим транзакцию
    await connection.commit();
    console.log('\n✅ All categories and subcategories imported successfully!');

    // Получаем статистику
    const [categoryCount] = await connection.query('SELECT COUNT(*) as count FROM categories');
    const [subcategoryCount] = await connection.query('SELECT COUNT(*) as count FROM subcategories');
    
    console.log(`\n📊 Statistics:`);
    console.log(`   Categories: ${categoryCount[0].count}`);
    console.log(`   Subcategories: ${subcategoryCount[0].count}`);

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error importing categories:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
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

