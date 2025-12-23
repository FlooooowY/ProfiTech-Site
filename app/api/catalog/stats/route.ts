import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';

// Кэш для статистики
const statsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 минут

function getCached(key: string) {
  const cached = statsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key: string, data: any) {
  statsCache.set(key, { data, timestamp: Date.now() });
}

/**
 * GET /api/catalog/stats - Получить статистику для фильтров (MongoDB версия)
 * Использует UNION логику для подкатегорий
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');
    const subcategoriesParam = searchParams.get('subcategories');
    const manufacturersParam = searchParams.get('manufacturers');
    
    console.log('[API Stats] Request params:', {
      categoryId,
      subcategoriesParam,
      manufacturersParam
    });
    
    // Создаем ключ кэша
    const cacheKey = `stats_${categoryId || 'all'}_${subcategoriesParam || 'none'}_${manufacturersParam || 'none'}`;
    const cached = getCached(cacheKey);
    if (cached) {
      console.log('[API Stats] Cache hit');
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      });
    }

    const productsCollection = await getCollection('products');
    const subcategoriesCollection = await getCollection('subcategories');
    
    // Проверяем подключение
    const totalProducts = await productsCollection.countDocuments({}, { maxTimeMS: 5000 });
    console.log('[API Stats] Total products in DB:', totalProducts);
    
    // Строим фильтр для товаров
    const filter: any = {};

    // Фильтр по категории
    if (categoryId) {
      filter.categoryId = categoryId;
    }

    // Фильтр по подкатегориям (UNION логика)
    if (subcategoriesParam) {
      const subcategories = subcategoriesParam.split(',').filter(Boolean);
      if (subcategories.length > 0) {
        const categoriesCollection = await getCollection('categories');
        
        // Получаем документы подкатегорий
        const subcategoryDocs = await subcategoriesCollection
          .find({ _id: { $in: subcategories } } as any)
          .toArray();
        
        // Получаем slug категории для формирования полного формата
        let categorySlug = null;
        if (categoryId) {
          const categoryDoc = await categoriesCollection.findOne({ _id: categoryId } as any);
          categorySlug = categoryDoc?.slug || categoryDoc?._id;
        }
        
        // Формируем полный формат subcategoryId: ${categorySlug}-${subcategorySlug}
        const subcategoryValues: string[] = [];
        
        for (const subDoc of subcategoryDocs) {
          const subSlug = subDoc.slug || subDoc._id || subDoc.id;
          if (categorySlug) {
            subcategoryValues.push(`${categorySlug}-${subSlug}`);
          } else {
            // Если нет категории, пробуем найти её через subcategory
            const subCategoryId = subDoc.categoryId;
            if (subCategoryId) {
              const catDoc = await categoriesCollection.findOne({ _id: subCategoryId } as any);
              const catSlug = catDoc?.slug || catDoc?._id || subCategoryId;
              subcategoryValues.push(`${catSlug}-${subSlug}`);
            } else {
              subcategoryValues.push(subSlug);
            }
          }
        }
        
        const allSubcategoryValues = [...new Set([...subcategories, ...subcategoryValues])];
        
        // Проверяем, выбраны ли все подкатегории категории
        if (categoryId) {
          const totalSubs = await subcategoriesCollection.countDocuments({ categoryId }, { maxTimeMS: 5000 });
          
          if (allSubcategoryValues.length !== totalSubs) {
            filter.subcategoryId = { $in: allSubcategoryValues };
          }
        } else {
          filter.subcategoryId = { $in: allSubcategoryValues };
        }
        
        console.log('[API Stats] Subcategory IDs:', subcategories);
        console.log('[API Stats] Category slug:', categorySlug);
        console.log('[API Stats] Subcategory values for filter:', allSubcategoryValues);
      }
    }

    // Фильтр по производителям (для обратной синхронизации)
    if (manufacturersParam) {
      const manufacturers = manufacturersParam.split(',').filter(Boolean);
      if (manufacturers.length > 0) {
        filter.manufacturer = { $in: manufacturers };
      }
    }

    // Получаем уникальных производителей (UNION логика)
    const manufacturerFilter = {
      ...filter,
      manufacturer: { 
        $exists: true, 
        $nin: ['', 'Не указан'] // $nin = not in (не равно ни одному из значений)
      }
    };
    
    console.log('[API Stats] Manufacturer filter:', JSON.stringify(manufacturerFilter, null, 2));
    const manufacturersStart = performance.now();
    const manufacturers = await productsCollection
      .distinct('manufacturer', manufacturerFilter)
      .then(results => results.filter(Boolean).sort());
    console.log('[API Stats] Manufacturers query time:', `${(performance.now() - manufacturersStart).toFixed(2)}ms, found:`, manufacturers.length);

    // Получаем характеристики (UNION логика)
    // Используем агрегацию для получения уникальных пар name-value
    const characteristicsPipeline: any[] = [
      { $match: filter },
      { $unwind: '$characteristics' },
      { $group: {
          _id: {
            name: '$characteristics.name',
            value: '$characteristics.value'
          }
        }
      },
      { $group: {
          _id: '$_id.name',
          values: { $addToSet: '$_id.value' }
        }
      },
      { $project: {
          name: '$_id',
          values: 1,
          _id: 0
        }
      },
      { $limit: 10000 }
    ];

    console.log('[API Stats] Characteristics pipeline:', JSON.stringify(characteristicsPipeline, null, 2));
    const characteristicsStart = performance.now();
    const characteristicsResult = await productsCollection
      .aggregate(characteristicsPipeline)
      .maxTimeMS(15000) // Таймаут 15 секунд для агрегации
      .toArray();
    console.log('[API Stats] Characteristics query time:', `${(performance.now() - characteristicsStart).toFixed(2)}ms, found:`, characteristicsResult.length);
    
    // Формируем объект характеристик
    const characteristics: { [key: string]: string[] } = {};
    characteristicsResult.forEach((item: any) => {
      if (item.name && item.values) {
        characteristics[item.name] = item.values.sort();
      }
    });

    // Получаем доступные категории (для обратной синхронизации)
    let availableCategories: string[] = [];
    if (manufacturersParam) {
      const categories = await productsCollection
        .distinct('categoryId', filter)
        .then(results => results.filter(Boolean));
      availableCategories = categories;
    } else if (subcategoriesParam) {
      // Если выбраны подкатегории, но не производители, показываем категории этих подкатегорий
      const subcategories = subcategoriesParam.split(',').filter(Boolean);
      if (subcategories.length > 0) {
        const subcategoriesDocs = await subcategoriesCollection
          .find({ _id: { $in: subcategories } } as any)
          .toArray();
        availableCategories = subcategoriesDocs
          .map((doc: any) => doc.categoryId || doc._id)
          .filter(Boolean);
      }
    } else if (categoryId) {
      availableCategories = [categoryId];
    } else {
      // Если ничего не выбрано, показываем все основные категории
      const categoriesCollection = await getCollection('categories');
      const allCategories = await categoriesCollection.find({}).toArray();
      availableCategories = allCategories.map((c: any) => {
        const id = c._id || c.id;
        return typeof id === 'string' ? id : String(id);
      }).filter(Boolean);
    }

    const result = {
      manufacturers,
      characteristics,
      categories: availableCategories,
    };
    setCache(cacheKey, result);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });

  } catch (error) {
    console.error('[API Catalog Stats] Error:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки статистики фильтров', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
