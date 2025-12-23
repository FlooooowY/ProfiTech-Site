import { NextRequest, NextResponse } from 'next/server';
import pool, { query } from '@/lib/db';
import { Product, ProductCharacteristic } from '@/types';

const PRODUCTS_PER_PAGE = 24;

// Кэш для часто используемых запросов
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 минут (увеличено для производительности)

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
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(PRODUCTS_PER_PAGE), 10)));
    
    // Курсорная пагинация вместо OFFSET для лучшей производительности
    const cursor = searchParams.get('cursor'); // Формат: "created_at|id" или null для первой страницы
    let cursorCreatedAt: string | null = null;
    let cursorId: string | null = null;
    
    if (cursor) {
      const [createdAt, id] = cursor.split('|');
      cursorCreatedAt = createdAt || null;
      cursorId = id || null;
    }
    
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
    const joinClause = joinConditions.length > 0 ? joinConditions.join(' ') : '';

    // Курсорная пагинация: добавляем условие WHERE для курсора (вместо OFFSET)
    let cursorCondition = '';
    const cursorParams: any[] = [];
    if (cursorCreatedAt && cursorId) {
      // Используем курсор для фильтрации: (created_at, id) > (cursor_created_at, cursor_id)
      cursorCondition = ` AND (p.created_at > ? OR (p.created_at = ? AND p.id > ?))`;
      cursorParams.push(cursorCreatedAt, cursorCreatedAt, cursorId);
    }
    
    const finalWhereClause = whereClause 
      ? whereClause + cursorCondition
      : (cursorCondition ? 'WHERE ' + cursorCondition.substring(5) : ''); // Убираем " AND " в начале
    
    // Проверяем кэш (используем cursor вместо page)
    const cacheKey = `catalog_${cursor || 'first'}_${limit}_${categoryId || 'all'}_${subcategoriesParam || 'none'}_${manufacturersParam || 'none'}_${characteristicsParam || 'none'}_${searchQuery || 'none'}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      });
    }

    // Убрали COUNT запрос - он очень медленный на больших таблицах (3000ms+)
    // Вместо этого используем курсорную пагинацию без подсчета общего количества
    
    // Оптимизированный запрос товаров с курсорной пагинацией (БЕЗ OFFSET!)
    const productsQuery = joinClause
      ? `
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
        ${finalWhereClause}
        ORDER BY p.created_at ASC, p.id ASC
        LIMIT ${limit}
      `
      : `
        SELECT 
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
        ${finalWhereClause}
        ORDER BY p.created_at ASC, p.id ASC
        LIMIT ${limit}
      `;
    
    // Объединяем параметры запроса с параметрами курсора
    const finalQueryParams = [...queryParams, ...cursorParams];

    // Выполняем запрос товаров (без COUNT - он очень медленный)
    const productsResult = await query(productsQuery, finalQueryParams);
    
    // Убеждаемся, что productsResult - массив
    let products: any[] = [];
    if (Array.isArray(productsResult)) {
      products = productsResult;
    } else if (productsResult && typeof productsResult === 'object' && '0' in productsResult) {
      // Если это объект с индексом 0 (возможно результат execute)
      const firstElement = (productsResult as any)[0];
      products = Array.isArray(firstElement) ? firstElement : [];
    }

    // Если товаров нет, возвращаем пустой результат сразу
    if (products.length === 0) {
      const emptyResult = {
        products: [],
        pagination: {
          limit,
          hasNextPage: false,
          nextCursor: null,
        },
      };
      setCache(cacheKey, emptyResult);
      return NextResponse.json(emptyResult, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      });
    }
    
    // Формируем курсор для следующей страницы (из последнего товара)
    const lastProduct = products[products.length - 1];
    const nextCursor = products.length === limit 
      ? `${lastProduct.createdAt}|${lastProduct.id}`
      : null;

    // Загружаем характеристики для полученных товаров (батч запрос, только для отображаемых товаров)
    const productIds = products.map(p => p.id);
    let characteristicsMap = new Map<string, ProductCharacteristic[]>();

    if (productIds.length > 0 && productIds.length <= 100) { // Загружаем только если товаров не слишком много
      const placeholders = productIds.map(() => '?').join(',');
      const characteristicsResult = await query(
        `SELECT product_id, name, value 
         FROM product_characteristics 
         WHERE product_id IN (${placeholders})
         ORDER BY product_id, name
         LIMIT 5000`, // Ограничиваем количество характеристик
        productIds
      );

      // Убеждаемся, что результат - массив
      let characteristics: any[] = [];
      if (Array.isArray(characteristicsResult)) {
        characteristics = characteristicsResult;
      } else if (characteristicsResult && typeof characteristicsResult === 'object' && '0' in characteristicsResult) {
        const firstElement = (characteristicsResult as any)[0];
        characteristics = Array.isArray(firstElement) ? firstElement : [];
      }

      characteristics.forEach((row: any) => {
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
    const formattedProducts: Product[] = products.map((p: any) => {
      // Обрабатываем images - может быть уже массивом, строкой JSON или null
      let images: string[] = [];
      if (p.images) {
        if (Array.isArray(p.images)) {
          images = p.images;
        } else if (typeof p.images === 'string') {
          try {
            const parsed = JSON.parse(p.images);
            images = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.error('[API Catalog] Error parsing images for product', p.id, ':', e);
            images = [];
          }
        }
      }

      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        categoryId: p.categoryId,
        subcategoryId: p.subcategoryId || undefined,
        manufacturer: p.manufacturer || 'Не указан',
        characteristics: characteristicsMap.get(p.id) || [],
        images,
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString()
      };
    });

    const queryTime = performance.now() - startTime;
    
    // Сохраняем в кэш
    const result = {
      products: formattedProducts,
      pagination: {
        limit,
        hasNextPage: nextCursor !== null,
        nextCursor,
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
