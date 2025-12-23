import { NextRequest, NextResponse } from 'next/server';
import pool, { query } from '@/lib/db';
import { Product, ProductCharacteristic } from '@/types';

const PRODUCTS_PER_PAGE = 24;

// Кэш для часто используемых запросов
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

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
 * GET /api/catalog - Получить товары с фильтрацией и пагинацией (оптимизированная версия с MySQL)
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    console.log('[API Catalog] Запрос:', Object.fromEntries(searchParams.entries()));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(PRODUCTS_PER_PAGE), 10)));
    const offset = (page - 1) * limit;
    
    const categoryId = searchParams.get('categoryId');
    const subcategoriesParam = searchParams.get('subcategories');
    const manufacturersParam = searchParams.get('manufacturers');
    const characteristicsParam = searchParams.get('characteristics');
    const searchQuery = searchParams.get('search')?.trim();

    // Строим оптимизированный SQL запрос
    let whereConditions: string[] = [];
    let joinConditions: string[] = [];
    const queryParams: any[] = [];

    // Фильтр по категории
    if (categoryId) {
      whereConditions.push('p.category_id = ?');
      queryParams.push(categoryId);
    }

    // Фильтр по подкатегориям (UNION логика - товары из любой из выбранных подкатегорий)
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
          
          if (subcategories.length !== totalSubs) {
            // Не все подкатегории выбраны - фильтруем по выбранным
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

    // Фильтр по производителям
    if (manufacturersParam) {
      const manufacturers = manufacturersParam.split(',').filter(Boolean);
      if (manufacturers.length > 0) {
        whereConditions.push('p.manufacturer IN (' + manufacturers.map(() => '?').join(',') + ')');
        queryParams.push(...manufacturers);
      }
    }

    // Фильтр по характеристикам (AND логика - товар должен иметь все выбранные характеристики)
    if (characteristicsParam) {
      try {
        const characteristics = JSON.parse(characteristicsParam) as { [key: string]: string[] };
        const charEntries = Object.entries(characteristics).filter(([_, values]) => values && values.length > 0);
        
        if (charEntries.length > 0) {
          // Для каждой характеристики создаем подзапрос
          charEntries.forEach(([charName, charValues], index) => {
            const alias = `pc${index}`;
            joinConditions.push(`
              INNER JOIN product_characteristics ${alias} ON p.id = ${alias}.product_id 
              AND ${alias}.name = ? 
              AND ${alias}.value IN (${charValues.map(() => '?').join(',')})
            `);
            queryParams.push(charName, ...charValues);
          });
        }
      } catch (e) {
        console.error('[API Catalog] Error parsing characteristics:', e);
      }
    }

    // Поиск по тексту (FULLTEXT индекс)
    if (searchQuery && searchQuery.length >= 2) {
      const searchWords = searchQuery.split(/\s+/).filter(w => w.length > 0);
      if (searchWords.length > 0) {
        // Используем FULLTEXT поиск для производительности
        const searchCondition = searchWords.map(() => '(p.name LIKE ? OR p.description LIKE ? OR p.manufacturer LIKE ?)').join(' AND ');
        whereConditions.push(`(${searchCondition})`);
        searchWords.forEach(word => {
          const likePattern = `%${word}%`;
          queryParams.push(likePattern, likePattern, likePattern);
        });
      }
    }

    // Строим финальный запрос
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    const joinClause = joinConditions.join(' ');
    
    // Запрос для подсчета общего количества (оптимизированный)
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      ${joinClause}
      ${whereClause}
    `;

    // Запрос для получения товаров с пагинацией
    const productsQuery = `
      SELECT DISTINCT 
        p.id,
        p.name,
        p.description,
        p.category_id as categoryId,
        p.subcategory_id as subcategoryId,
        p.manufacturer,
        p.images,
        p.created_at as createdAt,
        p.updated_at as updatedAt
      FROM products p
      ${joinClause}
      ${whereClause}
      ORDER BY p.id
      LIMIT ? OFFSET ?
    `;

    // Выполняем запросы параллельно для максимальной производительности
    const [countResult, productsResult] = await Promise.all([
      query(countQuery, queryParams),
      query(productsQuery, [...queryParams, limit, offset])
    ]);

    const total = (countResult as any[])[0]?.total || 0;
    const products = productsResult as any[];

    // Если товаров нет, возвращаем пустой результат сразу
    if (products.length === 0) {
      return NextResponse.json({
        products: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      });
    }

    // Загружаем характеристики для полученных товаров (батч запрос)
    const productIds = products.map(p => p.id);
    let characteristicsMap = new Map<string, ProductCharacteristic[]>();

    if (productIds.length > 0) {
      const placeholders = productIds.map(() => '?').join(',');
      const [characteristicsResult] = await query(
        `SELECT product_id, name, value 
         FROM product_characteristics 
         WHERE product_id IN (${placeholders})
         ORDER BY product_id, name`,
        productIds
      ) as any[];

      (characteristicsResult as any[]).forEach((row: any) => {
        if (!characteristicsMap.has(row.product_id)) {
          characteristicsMap.set(row.product_id, []);
        }
        characteristicsMap.get(row.product_id)!.push({
          name: row.name,
          value: row.value
        });
      });
    }

    // Формируем результат
    const formattedProducts: Product[] = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      categoryId: p.categoryId,
      subcategoryId: p.subcategoryId || undefined,
      manufacturer: p.manufacturer || 'Не указан',
      characteristics: characteristicsMap.get(p.id) || [],
      images: p.images ? JSON.parse(p.images) : [],
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString()
    }));

    const totalPages = Math.ceil(total / limit);
    const queryTime = performance.now() - startTime;

    return NextResponse.json({
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      _meta: {
        queryTime: `${queryTime.toFixed(2)}ms`
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
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
