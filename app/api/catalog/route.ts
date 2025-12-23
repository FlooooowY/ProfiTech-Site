import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { Product, ProductCharacteristic } from '@/types';

const PRODUCTS_PER_PAGE = 24;

// Кэш для часто используемых запросов
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 минут

function getCached(key: string) {
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key: string, data: any) {
  queryCache.set(key, { data, timestamp: Date.now() });
}

/**
 * GET /api/catalog - Получить товары с фильтрацией и пагинацией (MongoDB версия)
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(PRODUCTS_PER_PAGE), 10)));
    const skip = (page - 1) * limit;
    
    const categoryId = searchParams.get('categoryId');
    const subcategoriesParam = searchParams.get('subcategories');
    const manufacturersParam = searchParams.get('manufacturers');
    const characteristicsParam = searchParams.get('characteristics');
    const searchQuery = searchParams.get('search')?.trim();

    console.log('[API Catalog] Request params:', {
      page,
      limit,
      categoryId,
      subcategoriesParam,
      manufacturersParam,
      characteristicsParam,
      searchQuery
    });

    // Проверяем кэш
    const cacheKey = `catalog_${page}_${limit}_${categoryId || 'all'}_${subcategoriesParam || 'none'}_${manufacturersParam || 'none'}_${characteristicsParam || 'none'}_${searchQuery || 'none'}`;
    const cached = getCached(cacheKey);
    if (cached) {
      console.log('[API Catalog] Cache hit');
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      });
    }

    const productsCollection = await getCollection<Product>('products');
    
    // Проверяем подключение и количество товаров
    try {
      const totalProducts = await productsCollection.countDocuments({}, { maxTimeMS: 5000 });
      console.log('[API Catalog] Total products in DB:', totalProducts);
      
      if (totalProducts === 0) {
        console.warn('[API Catalog] WARNING: No products found in database!');
      }
    } catch (dbError) {
      console.error('[API Catalog] Database connection error:', dbError);
      return NextResponse.json(
        { error: 'Ошибка подключения к базе данных', details: dbError instanceof Error ? dbError.message : String(dbError) },
        { status: 500 }
      );
    }
    
    // Строим фильтр MongoDB
    const filter: any = {};

    // Фильтр по категории
    if (categoryId) {
      filter.categoryId = categoryId;
    }

    // Фильтр по подкатегориям (UNION логика)
    if (subcategoriesParam) {
      const subcategories = subcategoriesParam.split(',').filter(Boolean);
      if (subcategories.length > 0) {
        // Проверяем, выбраны ли все подкатегории категории
        if (categoryId) {
          const subcategoriesCollection = await getCollection('subcategories');
          const totalSubs = await subcategoriesCollection.countDocuments({ categoryId }, { maxTimeMS: 5000 });
          
          if (subcategories.length !== totalSubs) {
            // Не все подкатегории выбраны - фильтруем по выбранным
            filter.subcategoryId = { $in: subcategories };
          }
          // Если все подкатегории выбраны, не добавляем фильтр (работаем как с категорией)
        } else {
          filter.subcategoryId = { $in: subcategories };
        }
      }
    }

    // Фильтр по производителям
    if (manufacturersParam) {
      const manufacturers = manufacturersParam.split(',').filter(Boolean);
      if (manufacturers.length > 0) {
        filter.manufacturer = { $in: manufacturers };
      }
    }

    // Фильтр по характеристикам (AND логика - товар должен иметь все выбранные характеристики)
    const charFilters: any[] = [];
    if (characteristicsParam) {
      try {
        const characteristics = JSON.parse(characteristicsParam) as { [key: string]: string[] };
        const charEntries = Object.entries(characteristics).filter(([_, values]) => values && values.length > 0);
        
        if (charEntries.length > 0) {
          // Для MongoDB используем $elemMatch для проверки характеристик внутри массива
          charFilters.push(...charEntries.map(([charName, charValues]) => ({
            characteristics: {
              $elemMatch: {
                name: charName,
                value: { $in: charValues }
              }
            }
          })));
        }
      } catch (e) {
        console.error('[API Catalog] Error parsing characteristics:', e);
      }
    }

    // Полнотекстовый поиск (используем $regex вместо $text для совместимости)
    if (searchQuery && searchQuery.length >= 2) {
      const searchWords = searchQuery.split(/\s+/).filter(w => w.length > 0);
      if (searchWords.length > 0) {
        // AND логика: все слова должны быть найдены в любом из полей
        charFilters.push(...searchWords.map(word => ({
          $or: [
            { name: { $regex: word, $options: 'i' } },
            { description: { $regex: word, $options: 'i' } },
            { manufacturer: { $regex: word, $options: 'i' } }
          ]
        })));
      }
    }

    // Объединяем все $and условия
    if (charFilters.length > 0) {
      filter.$and = charFilters;
    }

    console.log('[API Catalog] Filter:', JSON.stringify(filter, null, 2));
    
    // Проверяем, есть ли товары с такими параметрами (для отладки)
    if (categoryId) {
      const testCount = await productsCollection.countDocuments({ categoryId }, { maxTimeMS: 5000 });
      console.log('[API Catalog] Products with categoryId:', categoryId, '=', testCount);
      
      if (subcategoriesParam) {
        const subcategories = subcategoriesParam.split(',').filter(Boolean);
        if (subcategories.length > 0) {
          // Проверяем реальные subcategoryId в базе
          const sampleProduct = await productsCollection.findOne({ categoryId }, { maxTimeMS: 5000 });
          console.log('[API Catalog] Sample product subcategoryId:', sampleProduct?.subcategoryId);
          console.log('[API Catalog] Looking for subcategoryId:', subcategories[0]);
          
          // Проверяем, есть ли товары с таким subcategoryId
          const subCount = await productsCollection.countDocuments({ 
            categoryId, 
            subcategoryId: subcategories[0] 
          }, { maxTimeMS: 5000 });
          console.log('[API Catalog] Products with subcategoryId:', subcategories[0], '=', subCount);
        }
      }
    }

    // COUNT запрос только для первых 10 страниц (оптимизация)
    const shouldCount = page <= 10;
    const countStart = performance.now();
    const total = shouldCount 
      ? await productsCollection.countDocuments(filter, { maxTimeMS: 10000 })
      : 0;
    console.log('[API Catalog] Count query time:', `${(performance.now() - countStart).toFixed(2)}ms, total:`, total);

    // Запрос товаров с пагинацией
    // Используем maxTimeMS для предотвращения зависаний
    const findStart = performance.now();
    const products = await productsCollection
      .find(filter)
      .sort({ createdAt: 1, _id: 1 }) // Сортировка для стабильной пагинации
      .skip(skip)
      .limit(limit)
      .maxTimeMS(10000) // Таймаут 10 секунд
      .toArray();
    console.log('[API Catalog] Find query time:', `${(performance.now() - findStart).toFixed(2)}ms, found:`, products.length);

    // Если товаров нет, возвращаем пустой результат
    if (products.length === 0) {
      const emptyResult = {
        products: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: page > 1,
        },
      };
      setCache(cacheKey, emptyResult);
      return NextResponse.json(emptyResult, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      });
    }

    // Форматируем результат
    const formattedProducts: Product[] = products.map((p: any) => ({
      id: p._id || p.id,
      name: p.name || '',
      description: p.description || '',
      categoryId: p.categoryId,
      subcategoryId: p.subcategoryId || undefined,
      manufacturer: p.manufacturer || 'Не указан',
      characteristics: p.characteristics || [],
      images: Array.isArray(p.images) ? p.images : (p.images ? JSON.parse(p.images) : []),
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString()
    }));

    const totalPages = shouldCount ? Math.ceil(total / limit) : 0;
    const queryTime = performance.now() - startTime;
    
    // Сохраняем в кэш
    const result = {
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total: shouldCount ? total : 0,
        totalPages,
        hasNextPage: shouldCount ? page < totalPages : products.length === limit,
        hasPrevPage: page > 1,
      },
      _meta: {
        queryTime: `${queryTime.toFixed(2)}ms`
      }
    };
    setCache(cacheKey, result);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });

  } catch (error) {
    console.error('[API Catalog] Error:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки каталога', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

