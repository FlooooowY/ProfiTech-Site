import { NextRequest, NextResponse } from 'next/server';
import { importAllCatalogs, saveProductsToJSON, saveCategoriesToJSON } from '@/scripts/importCatalog';

/**
 * API endpoint для импорта каталога из CSV файлов
 * POST /api/import
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📦 Начинаем импорт каталога...');

    // Импортируем все каталоги
    const result = await importAllCatalogs();

    if (result.totalProducts === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Не удалось импортировать товары',
          errors: result.errors,
        },
        { status: 400 }
      );
    }

    // Сохраняем продукты и категории
    const productsSaved = saveProductsToJSON(result.products);
    const categoriesSaved = saveCategoriesToJSON(result.categories);

    if (!productsSaved || !categoriesSaved) {
      return NextResponse.json(
        {
          success: false,
          message: 'Ошибка сохранения данных',
          errors: result.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Импорт завершен успешно',
      data: {
        totalFiles: result.totalFiles,
        totalProducts: result.totalProducts,
        totalCategories: result.categories.size,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error('Ошибка импорта:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Критическая ошибка при импорте',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/import - Получить статус импорта
 */
export async function GET() {
  try {
    const fs = require('fs');
    const path = require('path');

    const productsPath = path.join(process.cwd(), 'public/data/products.json');
    const categoriesPath = path.join(process.cwd(), 'public/data/categories.json');

    const productsExist = fs.existsSync(productsPath);
    const categoriesExist = fs.existsSync(categoriesPath);

    let totalProducts = 0;
    let totalCategories = 0;

    if (productsExist) {
      const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
      totalProducts = products.length;
    }

    if (categoriesExist) {
      const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
      totalCategories = categories.length;
    }

    return NextResponse.json({
      imported: productsExist && categoriesExist,
      totalProducts,
      totalCategories,
      productsPath: productsExist ? '/data/products.json' : null,
      categoriesPath: categoriesExist ? '/data/categories.json' : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Не удалось получить статус импорта',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

