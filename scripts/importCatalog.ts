import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Product } from '@/types';
import { CATEGORY_MAPPING } from '@/utils/categoryMapping';

interface CSVRow {
  'Изображения': string;
  'Название': string;
  'Артикул': string;
  'Цена': string;
  'Валюта': string;
  'Наличие': string;
  'Бренд'?: string;
  'Категория': string;
  'Подкатегория': string;
  'Раздел'?: string;
  'URL': string;
  'Описание': string;
  'Код товара': string;
  [key: string]: string | undefined;
}

interface ImportResult {
  totalFiles: number;
  totalProducts: number;
  products: Product[];
  categories: Map<string, { name: string; subcategories: Set<string> }>;
  errors: string[];
}

/**
 * Парсит CSV файл и возвращает массив продуктов
 */
function parseCSVFile(filePath: string): { products: Product[]; error?: string } {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Парсим CSV
    const records: CSVRow[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ',',
      relax_column_count: true,
      trim: true,
    });

    // Получаем имя файла для уникальности ID
    const fileName = path.basename(filePath, '.csv');
    const fileHash = fileName.substring(0, 8); // Первые 8 символов имени файла

    const products: Product[] = records.map((row, index) => {
      // Обрабатываем изображения (разделитель ;)
      const images = row['Изображения']
        ? row['Изображения'].split(';').map(img => img.trim()).filter(Boolean)
        : [];

      // Извлекаем характеристики из колонок
      const characteristics = extractCharacteristics(row);

      // Генерируем УНИКАЛЬНЫЙ ID: файл + артикул + индекс для гарантии уникальности
      const articleCode = row['Артикул'] || row['Код товара'] || '';
      const productId = `${fileHash}-${articleCode || index}-${index}`.replace(/\s+/g, '-');

      // Извлекаем категорию и подкатегорию
      const category = row['Категория'] || 'Без категории';
      const subcategory = row['Подкатегория'] || row['Раздел'] || '';

      // Генерируем ID и сразу нормализуем под константы
      const rawCategoryId = generateCategoryId(category);
      const normalizedCategoryId = CATEGORY_MAPPING[rawCategoryId] || rawCategoryId;

      return {
        id: productId,
        name: row['Название'] || 'Без названия',
        description: row['Описание'] || '',
        categoryId: normalizedCategoryId,
        subcategoryId: subcategory ? generateSubcategoryId(category, subcategory) : undefined,
        manufacturer: row['Бренд'] || 'Не указан',
        characteristics,
        images,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    return { products };
  } catch (error) {
    return { 
      products: [], 
      error: `Ошибка парсинга файла ${filePath}: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Извлекает характеристики из строки CSV
 */
function extractCharacteristics(row: CSVRow) {
  const characteristics: Array<{ name: string; value: string }> = [];
  
  // Список стандартных колонок, которые не являются характеристиками
  // Исключаем Цена, Валюта, Наличие, Остаток - они не импортируются
  const excludeColumns = new Set([
    'Изображения', 'Название', 'Артикул', 'Цена', 'Валюта', 'Наличие',
    'Бренд', 'Категория', 'Подкатегория', 'Раздел', 'URL', 'Описание',
    'Код товара', 'Остаток', 'Файлы', 'Старая цена', 'Видео', 'Производитель'
  ]);

  // Перебираем все колонки
  Object.entries(row).forEach(([key, value]) => {
    if (!excludeColumns.has(key) && value && value.trim() !== '' && value !== '-') {
      characteristics.push({
        name: key,
        value: value.trim(),
      });
    }
  });

  return characteristics;
}

/**
 * Генерирует ID категории из названия
 */
function generateCategoryId(categoryName: string): string {
  return categoryName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-zа-яё0-9-]/gi, '')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Генерирует ID подкатегории
 */
function generateSubcategoryId(categoryName: string, subcategoryName: string): string {
  const catId = generateCategoryId(categoryName);
  const subId = subcategoryName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-zа-яё0-9-]/gi, '')
    .replace(/-+/g, '-')
    .trim();
  return `${catId}-${subId}`;
}

/**
 * Сканирует все CSV файлы в директории и импортирует продукты
 */
export async function importAllCatalogs(csvDirectory: string = 'public/uploads/csv'): Promise<ImportResult> {
  const result: ImportResult = {
    totalFiles: 0,
    totalProducts: 0,
    products: [],
    categories: new Map(),
    errors: [],
  };

  try {
    // Рекурсивно находим все CSV файлы
    const csvFiles = findAllCSVFiles(csvDirectory);
    result.totalFiles = csvFiles.length;

    console.log(`Найдено ${csvFiles.length} CSV файлов`);

    // Обрабатываем каждый файл
    for (const filePath of csvFiles) {
      console.log(`Обработка: ${path.basename(filePath)}`);
      
      const { products, error } = parseCSVFile(filePath);
      
      if (error) {
        result.errors.push(error);
        continue;
      }

      // Добавляем продукты
      result.products.push(...products);
      result.totalProducts += products.length;

      // Собираем категории
      products.forEach(product => {
        const categoryId = product.categoryId;
        if (!result.categories.has(categoryId)) {
          result.categories.set(categoryId, {
            name: extractCategoryNameFromId(categoryId),
            subcategories: new Set(),
          });
        }
        
        if (product.subcategoryId) {
          result.categories.get(categoryId)?.subcategories.add(product.subcategoryId);
        }
      });
    }

    console.log(`\nИмпорт завершен:`);
    console.log(`- Файлов обработано: ${result.totalFiles}`);
    console.log(`- Товаров импортировано: ${result.totalProducts}`);
    console.log(`- Категорий найдено: ${result.categories.size}`);
    console.log(`- Ошибок: ${result.errors.length}`);

    return result;
  } catch (error) {
    result.errors.push(`Критическая ошибка: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

/**
 * Рекурсивно находит все CSV файлы в директории
 */
function findAllCSVFiles(directory: string): string[] {
  const csvFiles: string[] = [];
  
  function scanDirectory(dir: string) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (stat.isFile() && item.endsWith('.csv')) {
        csvFiles.push(fullPath);
      }
    });
  }
  
  scanDirectory(directory);
  return csvFiles;
}

/**
 * Извлекает название категории из ID
 */
function extractCategoryNameFromId(categoryId: string): string {
  return categoryId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Сохраняет импортированные продукты в JSON файл
 */
export function saveProductsToJSON(products: Product[], outputPath: string = 'public/data/products.json') {
  try {
    // Создаем директорию если не существует
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Сохраняем продукты
    fs.writeFileSync(outputPath, JSON.stringify(products, null, 2), 'utf-8');
    console.log(`\nПродукты сохранены в: ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`Ошибка сохранения: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Сохраняет категории в JSON файл
 */
export function saveCategoriesToJSON(
  categories: Map<string, { name: string; subcategories: Set<string> }>,
  outputPath: string = 'public/data/categories.json'
) {
  try {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Конвертируем Map в массив объектов
    const categoriesArray = Array.from(categories.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      slug: id,
      subcategories: Array.from(data.subcategories).map(subId => ({
        id: subId,
        name: extractCategoryNameFromId(subId.split('-').slice(1).join('-')),
        slug: subId,
        categoryId: id,
      })),
    }));

    fs.writeFileSync(outputPath, JSON.stringify(categoriesArray, null, 2), 'utf-8');
    console.log(`Категории сохранены в: ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`Ошибка сохранения категорий: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// Если скрипт запускается напрямую
if (require.main === module) {
  (async () => {
    console.log('🚀 Начинаем импорт каталога...\n');
    
    const result = await importAllCatalogs();
    
    if (result.totalProducts > 0) {
      saveProductsToJSON(result.products);
      saveCategoriesToJSON(result.categories);
    }
    
    if (result.errors.length > 0) {
      console.log('\n⚠️ Ошибки при импорте:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
  })();
}

