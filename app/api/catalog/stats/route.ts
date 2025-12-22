import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/types';
import { CATEGORIES } from '@/constants/categories';

// Импортируем функцию загрузки из основного файла
// Для оптимизации используем тот же кэш
let productsCache: Product[] | null = null;
let categoryIndex: Map<string, Product[]> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

function loadProductsFromFile(): Product[] {
  const fs = require('fs');
  const path = require('path');
  const now = Date.now();
  
  if (productsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return productsCache;
  }

  const productsPath = path.join(process.cwd(), 'public/data/products.json');
  
  if (!fs.existsSync(productsPath)) {
    return [];
  }

  const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf-8')) as Product[];
  const validProducts = productsData.filter(p => p && p.id);
  
  productsCache = validProducts;
  cacheTimestamp = now;
  
  categoryIndex = new Map();
  validProducts.forEach(product => {
    if (product.categoryId) {
      if (!categoryIndex!.has(product.categoryId)) {
        categoryIndex!.set(product.categoryId, []);
      }
      categoryIndex!.get(product.categoryId)!.push(product);
    }
  });
  
  return validProducts;
}

/**
 * GET /api/catalog/stats - Получить статистику каталога (производители, характеристики)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');
    const subcategoriesParam = searchParams.get('subcategories');
    const manufacturersParam = searchParams.get('manufacturers');

    console.log('[API Stats] Request params:', {
      categoryId,
      subcategories: subcategoriesParam,
      manufacturers: manufacturersParam
    });

    const allProducts = loadProductsFromFile();
    
    if (allProducts.length === 0) {
      return NextResponse.json(
        { error: 'Каталог не найден' },
        { status: 404 }
      );
    }
    
    // Используем индекс для быстрой фильтрации по категории
    let products: Product[];
    if (categoryId && categoryIndex && categoryIndex.has(categoryId)) {
      products = categoryIndex.get(categoryId)!;
    } else if (categoryId) {
      // Если индекс не построен, фильтруем вручную
      products = allProducts.filter(p => p.categoryId === categoryId);
    } else {
      products = allProducts;
    }

    // Фильтр по подкатегориям
    // Проверяем, выбраны ли все подкатегории категории
    let shouldIgnoreSubcategories = false;
    if (categoryId && subcategoriesParam && products.length > 0) {
      const category = CATEGORIES.find(c => c.id === categoryId);
      const allSubcategories = category?.subcategories || [];
      const selectedSubcategories = subcategoriesParam.split(',').filter(Boolean);
      
      // Если количество выбранных подкатегорий равно общему количеству подкатегорий
      if (allSubcategories.length > 0 && selectedSubcategories.length === allSubcategories.length) {
        const allSubcategoryIds = new Set(allSubcategories.map(s => s.id));
        const selectedSubcategoryIds = new Set(selectedSubcategories);
        
        // Проверяем, что все подкатегории выбраны
        shouldIgnoreSubcategories = allSubcategoryIds.size === selectedSubcategoryIds.size &&
                                    Array.from(allSubcategoryIds).every(id => selectedSubcategoryIds.has(id));
        
        if (shouldIgnoreSubcategories) {
          console.log('[API Stats] All subcategories selected, ignoring subcategories filter');
        }
      }
    }

    // Фильтр по подкатегориям (только если не все подкатегории выбраны)
    // Используем UNION (объединение) - товары из любой из выбранных подкатегорий
    if (!shouldIgnoreSubcategories && subcategoriesParam && products.length > 0) {
      const subcategories = subcategoriesParam.split(',').filter(Boolean);
      if (subcategories.length > 0) {
        const subcategorySet = new Set(subcategories);
        const productsBeforeFilter = products.length;
        // UNION логика: товары, у которых subcategoryId есть в множестве выбранных подкатегорий
        products = products.filter(p => {
          const hasSubcategory = p.subcategoryId && subcategorySet.has(p.subcategoryId);
          return hasSubcategory;
        });
        
        console.log('[API Stats] Subcategories filter:', {
          selectedSubcategories: subcategories,
          productsBefore: productsBeforeFilter,
          productsAfter: products.length,
          sampleProductSubcategories: products.slice(0, 5).map(p => p.subcategoryId)
        });
      }
    }

    // Фильтр по производителям (для обратной синхронизации)
    if (manufacturersParam && products.length > 0) {
      const manufacturers = manufacturersParam.split(',').filter(Boolean);
      if (manufacturers.length > 0) {
        const manufacturerSet = new Set(manufacturers);
        products = products.filter(p => p.manufacturer && manufacturerSet.has(p.manufacturer));
      }
    }

    // Получаем уникальных производителей (UNION - все производители из выбранных подкатегорий)
    const manufacturers = Array.from(
      new Set(products.filter(p => p.manufacturer && p.manufacturer.trim() !== '').map(p => p.manufacturer))
    ).filter(Boolean).sort() as string[];

    console.log('[API Stats] Manufacturers extraction:', {
      totalProducts: products.length,
      productsWithManufacturer: products.filter(p => p.manufacturer && p.manufacturer.trim() !== '').length,
      uniqueManufacturers: manufacturers.length,
      sampleManufacturers: manufacturers.slice(0, 10)
    });

    // Получаем уникальные характеристики (UNION - все значения из выбранных подкатегорий)
    const characteristicsMap: { [key: string]: Set<string> } = {};
    let productsWithCharacteristics = 0;
    products.forEach(product => {
      if (product.characteristics && Array.isArray(product.characteristics) && product.characteristics.length > 0) {
        productsWithCharacteristics++;
        product.characteristics.forEach(char => {
          if (char && char.name && char.value && char.name.trim() !== '' && char.value.trim() !== '') {
            if (!characteristicsMap[char.name]) {
              characteristicsMap[char.name] = new Set();
            }
            characteristicsMap[char.name].add(char.value);
          }
        });
      }
    });
    
    console.log('[API Stats] Characteristics extraction:', {
      totalProducts: products.length,
      productsWithCharacteristics,
      characteristicsCount: Object.keys(characteristicsMap).length,
      sampleCharacteristics: Object.keys(characteristicsMap).slice(0, 5)
    });

    const characteristics: { [key: string]: string[] } = {};
    Object.keys(characteristicsMap).sort().forEach(key => {
      characteristics[key] = Array.from(characteristicsMap[key]).sort();
    });

    // Получаем доступные категории (для обратной синхронизации)
    const availableCategories = Array.from(
      new Set(products.filter(p => p.categoryId).map(p => p.categoryId))
    ).filter(Boolean) as string[];

    console.log('[API Stats] Response:', {
      manufacturersCount: manufacturers.length,
      characteristicsCount: Object.keys(characteristics).length,
      productsCount: products.length,
      ignoredSubcategories: shouldIgnoreSubcategories
    });

    return NextResponse.json({
      manufacturers,
      characteristics,
      categories: availableCategories,
      totalProducts: products.length,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    return NextResponse.json(
      { error: 'Ошибка получения статистики' },
      { status: 500 }
    );
  }
}

