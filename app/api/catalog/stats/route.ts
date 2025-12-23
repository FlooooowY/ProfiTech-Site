import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Кэш для статистики
const statsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 минут (увеличено для производительности)

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
 * GET /api/catalog/stats - Получить статистику для фильтров (оптимизированная версия с MySQL)
 * Использует UNION логику для подкатегорий
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');
    const subcategoriesParam = searchParams.get('subcategories');
    const manufacturersParam = searchParams.get('manufacturers');
    
    // Убрали лишние логи для производительности

    // Создаем ключ кэша
    const cacheKey = `stats_${categoryId || 'all'}_${subcategoriesParam || 'none'}_${manufacturersParam || 'none'}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300'
        }
      });
    }

    // Строим условия для фильтрации товаров
    let whereConditions: string[] = [];
    const queryParams: any[] = [];

    // Фильтр по категории
    if (categoryId) {
      whereConditions.push('p.category_id = ?');
      queryParams.push(categoryId);
    }

    // Фильтр по подкатегориям (UNION логика)
    if (subcategoriesParam) {
      const subcategories = subcategoriesParam.split(',').filter(Boolean);
      if (subcategories.length > 0) {
        // Проверяем, выбраны ли все подкатегории категории
        if (categoryId) {
          const [subCountResult] = await query(
            'SELECT COUNT(*) as total FROM subcategories WHERE category_id = ?',
            [categoryId]
          ) as any[];
          const totalSubs = (subCountResult as any).total;
          
          // Если выбраны не все подкатегории, фильтруем по выбранным
          if (subcategories.length !== totalSubs) {
            whereConditions.push('p.subcategory_id IN (' + subcategories.map(() => '?').join(',') + ')');
            queryParams.push(...subcategories);
          }
          // Если все подкатегории выбраны, не добавляем фильтр (работаем как с категорией)
        } else {
          whereConditions.push('p.subcategory_id IN (' + subcategories.map(() => '?').join(',') + ')');
          queryParams.push(...subcategories);
        }
      }
    }

    // Фильтр по производителям (для обратной синхронизации)
    if (manufacturersParam) {
      const manufacturers = manufacturersParam.split(',').filter(Boolean);
      if (manufacturers.length > 0) {
        whereConditions.push('p.manufacturer IN (' + manufacturers.map(() => '?').join(',') + ')');
        queryParams.push(...manufacturers);
      }
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // Формируем WHERE для производителей
    let manufacturerWhere: string;
    if (whereClause) {
      manufacturerWhere = whereClause + ' AND p.manufacturer IS NOT NULL AND p.manufacturer != \'\' AND p.manufacturer != \'Не указан\'';
    } else {
      manufacturerWhere = 'WHERE p.manufacturer IS NOT NULL AND p.manufacturer != \'\' AND p.manufacturer != \'Не указан\'';
    }

    // Получаем уникальных производителей (UNION логика - все производители из выбранных подкатегорий)
    const manufacturersQuery = `
      SELECT DISTINCT p.manufacturer
      FROM products p
      ${manufacturerWhere}
      ORDER BY p.manufacturer
      LIMIT 1000
    `;
    
    // Убрали лишние логи для производительности

    // Получаем характеристики (UNION логика - все характеристики из выбранных подкатегорий)
    const characteristicsWhere = whereClause ? whereClause : '';
    const characteristicsQuery = `
      SELECT DISTINCT 
        pc.name,
        pc.value
      FROM product_characteristics pc
      INNER JOIN products p ON pc.product_id = p.id
      ${characteristicsWhere}
      ORDER BY pc.name, pc.value
      LIMIT 10000
    `;

    // Получаем доступные категории (для обратной синхронизации)
    let availableCategories: string[] = [];
    if (manufacturersParam) {
      const categoryWhere = whereClause 
        ? whereClause + ' AND p.category_id IS NOT NULL'
        : 'WHERE p.category_id IS NOT NULL';
      const categoriesQuery = `
        SELECT DISTINCT p.category_id
        FROM products p
        ${categoryWhere}
      `;
      const [categoriesResult] = await query(categoriesQuery, queryParams) as any[];
      availableCategories = (categoriesResult as any[]).map((row: any) => row.category_id);
    }

    // Выполняем запросы параллельно для максимальной производительности
    const [manufacturersResult, characteristicsResult] = await Promise.all([
      query(manufacturersQuery, queryParams),
      query(characteristicsQuery, queryParams)
    ]);

    // Формируем список производителей
    const manufacturers = (manufacturersResult as any[])
      .map((row: any) => row.manufacturer)
      .filter(Boolean)
      .sort();

    // Группируем характеристики по имени
    const characteristics: { [key: string]: string[] } = {};
    (characteristicsResult as any[]).forEach((row: any) => {
      if (!characteristics[row.name]) {
        characteristics[row.name] = [];
      }
      if (!characteristics[row.name].includes(row.value)) {
        characteristics[row.name].push(row.value);
      }
    });

    // Сортируем значения характеристик
    Object.keys(characteristics).forEach(key => {
      characteristics[key].sort();
    });

    const result = {
      manufacturers,
      characteristics,
      availableCategories
    };

    // Кэшируем результат
    setCache(cacheKey, result);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300'
      }
    });

  } catch (error) {
    console.error('[API Catalog Stats] Error:', error);
    return NextResponse.json(
      { 
        manufacturers: [],
        characteristics: {},
        availableCategories: [],
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
