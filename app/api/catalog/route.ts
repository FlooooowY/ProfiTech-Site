import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Product } from '@/types';

const PRODUCTS_PER_PAGE = 24;

// Кэш в памяти для оптимизации
let productsCache: Product[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 минут (увеличено для лучшей производительности)

// Индексы для быстрого поиска
let categoryIndex: Map<string, Product[]> | null = null;
let manufacturerIndex: Map<string, Product[]> | null = null;
let subcategoryIndex: Map<string, Product[]> | null = null;
// Индекс по характеристикам: Map<characteristicName, Map<characteristicValue, Set<productId>>>
let characteristicIndex: Map<string, Map<string, Set<string>>> | null = null;

function loadProductsFromFile(): Product[] {
  const now = Date.now();
  
  // Используем кэш если он актуален
  if (productsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return productsCache;
  }

  const productsPath = path.join(process.cwd(), 'public/data/products.json');
  
  if (!fs.existsSync(productsPath)) {
    return [];
  }

  const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf-8')) as Product[];
  const validProducts = productsData.filter(p => p && p.id);
  
  // Обновляем кэш
  productsCache = validProducts;
  cacheTimestamp = now;
  
  // Строим индексы для быстрой фильтрации
  categoryIndex = new Map();
  manufacturerIndex = new Map();
  subcategoryIndex = new Map();
  characteristicIndex = new Map();
  
  // Оптимизированное построение индексов за один проход
  validProducts.forEach(product => {
    // Индекс по категориям
    if (product.categoryId) {
      if (!categoryIndex!.has(product.categoryId)) {
        categoryIndex!.set(product.categoryId, []);
      }
      categoryIndex!.get(product.categoryId)!.push(product);
    }
    
    // Индекс по подкатегориям (для быстрой фильтрации)
    if (product.subcategoryId) {
      if (!subcategoryIndex!.has(product.subcategoryId)) {
        subcategoryIndex!.set(product.subcategoryId, []);
      }
      subcategoryIndex!.get(product.subcategoryId)!.push(product);
    }
    
    // Индекс по производителям
    if (product.manufacturer && product.manufacturer.trim() !== '') {
      if (!manufacturerIndex!.has(product.manufacturer)) {
        manufacturerIndex!.set(product.manufacturer, []);
      }
      manufacturerIndex!.get(product.manufacturer)!.push(product);
    }
    
    // Индекс по характеристикам (name -> value -> Set<productId>)
    if (product.characteristics && Array.isArray(product.characteristics)) {
      product.characteristics.forEach(char => {
        if (char && char.name && char.value) {
          if (!characteristicIndex!.has(char.name)) {
            characteristicIndex!.set(char.name, new Map());
          }
          const valueMap = characteristicIndex!.get(char.name)!;
          if (!valueMap.has(char.value)) {
            valueMap.set(char.value, new Set());
          }
          valueMap.get(char.value)!.add(product.id);
        }
      });
    }
  });
  
  // Индексы построены, логирование убрано для производительности
  
  return validProducts;
}

/**
 * GET /api/catalog - Получить товары с фильтрацией и пагинацией
 * Query params:
 * - page: номер страницы (default: 1)
 * - limit: количество товаров на странице (default: 24)
 * - categoryId: фильтр по категории
 * - subcategoryId: фильтр по подкатегории
 * - manufacturers: фильтр по производителям (через запятую)
 * - characteristics: фильтр по характеристикам (JSON string)
 * - search: поисковый запрос
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || String(PRODUCTS_PER_PAGE), 10);
    const categoryId = searchParams.get('categoryId');
    const subcategoriesParam = searchParams.get('subcategories'); // Множественный выбор
    const subcategoryId = searchParams.get('subcategoryId'); // Для обратной совместимости
    const manufacturersParam = searchParams.get('manufacturers');
    const characteristicsParam = searchParams.get('characteristics');
    const searchQuery = searchParams.get('search');

    // Убрали логирование для производительности

    // Загружаем продукты из кэша
    const cacheStart = performance.now();
    const allProducts = loadProductsFromFile();
    const cacheTime = performance.now() - cacheStart;
    
    if (allProducts.length === 0) {
      return NextResponse.json(
        { error: 'Каталог не найден. Запустите импорт сначала.' },
        { status: 404 }
      );
    }

    // Оптимизированная фильтрация с использованием индексов
    const filterStart = performance.now();
    let filtered: Product[];
    
    // Если есть фильтр по категории, используем индекс
    if (categoryId && categoryIndex) {
      filtered = categoryIndex.get(categoryId) || [];
    } else {
      filtered = [...allProducts];
    }

    // Шаг 2: Фильтр по подкатегориям (множественный выбор) - UNION логика с использованием индекса
    if ((subcategoriesParam || subcategoryId) && filtered.length > 0) {
      const subcategories = subcategoriesParam 
        ? subcategoriesParam.split(',').filter(Boolean)
        : subcategoryId 
          ? [subcategoryId]
          : [];
      if (subcategories.length > 0) {
        const beforeCount = filtered.length;
        
        // Оптимизация: если есть индекс по подкатегориям и мы фильтруем по категории,
        // используем индекс для быстрого получения товаров
        if (subcategoryIndex && subcategories.length <= 10) {
          // Для небольшого количества подкатегорий используем индекс
          const indexedProducts: Product[] = [];
          const productIdSet = new Set<string>();
          
          subcategories.forEach(subId => {
            const subProducts = subcategoryIndex!.get(subId) || [];
            subProducts.forEach(p => {
              if (!productIdSet.has(p.id)) {
                productIdSet.add(p.id);
                indexedProducts.push(p);
              }
            });
          });
          
          // Пересекаем с уже отфильтрованными товарами (по категории)
          if (categoryId) {
            const categoryProductIds = new Set(filtered.map(p => p.id));
            filtered = indexedProducts.filter(p => categoryProductIds.has(p.id));
          } else {
            filtered = indexedProducts;
          }
        } else {
          // Для большого количества используем обычную фильтрацию
          const subcategorySet = new Set(subcategories);
          filtered = filtered.filter(p => p.subcategoryId && subcategorySet.has(p.subcategoryId));
        }
        
        // Логирование убрано для производительности
      }
    }

    // Ранний выход если нет товаров после фильтрации по подкатегориям
    if (filtered.length === 0) {
      return NextResponse.json({
        products: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    }
    
    // Шаг 3: Фильтр по производителям - оптимизированная версия с использованием индекса
    if (manufacturersParam && filtered.length > 0) {
      const manufacturers = manufacturersParam.split(',').filter(Boolean);
      if (manufacturers.length > 0 && manufacturerIndex) {
        if (manufacturers.length === 1) {
          // Если один производитель, используем индекс
          const manufacturerProducts = manufacturerIndex.get(manufacturers[0]) || [];
          const productSet = new Set(manufacturerProducts.map(p => p.id));
          filtered = filtered.filter(p => productSet.has(p.id));
        } else if (manufacturers.length <= 5) {
          // Для небольшого количества производителей используем индекс
          const indexedProducts: Product[] = [];
          const productIdSet = new Set<string>();
          
          manufacturers.forEach(manufacturer => {
            const manProducts = manufacturerIndex!.get(manufacturer) || [];
            manProducts.forEach(p => {
              if (!productIdSet.has(p.id)) {
                productIdSet.add(p.id);
                indexedProducts.push(p);
              }
            });
          });
          
          // Пересекаем с уже отфильтрованными товарами
          const filteredProductIds = new Set(filtered.map(p => p.id));
          filtered = indexedProducts.filter(p => filteredProductIds.has(p.id));
        } else {
          // Для большого количества используем обычную фильтрацию
          const manufacturerSet = new Set(manufacturers);
          filtered = filtered.filter(p => p.manufacturer && manufacturerSet.has(p.manufacturer));
        }
      }
    }
    
    // Ранний выход если нет товаров после фильтрации по производителям
    if (filtered.length === 0) {
      return NextResponse.json({
        products: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    }

    // Шаг 4: Фильтр по характеристикам - оптимизированная версия с использованием индекса
    if (characteristicsParam && filtered.length > 0) {
      try {
        const characteristics = JSON.parse(characteristicsParam) as { [key: string]: string[] };
        const charEntries = Object.entries(characteristics).filter(([key, values]) => 
          values && values.length > 0
        );
        
        if (charEntries.length > 0 && characteristicIndex) {
          // Используем индекс для быстрой фильтрации
          let matchingProductIds: Set<string> | null = null;
          
          charEntries.forEach(([charName, charValues]) => {
            if (filtered.length === 0) return; // Ранний выход если уже нет товаров
            
            const charValueMap = characteristicIndex!.get(charName);
            if (!charValueMap) {
              // Характеристика не найдена в индексе - исключаем все товары
              matchingProductIds = new Set();
              return;
            }
            
            // Собираем ID товаров, которые имеют хотя бы одно из выбранных значений
            const charMatchingIds = new Set<string>();
            charValues.forEach(value => {
              const productIds = charValueMap.get(value);
              if (productIds) {
                productIds.forEach(id => charMatchingIds.add(id));
              }
            });
            
            if (matchingProductIds === null) {
              // Первая характеристика - используем все найденные ID
              matchingProductIds = charMatchingIds;
            } else {
              // Пересечение с предыдущими результатами (AND логика)
              matchingProductIds = new Set(
                Array.from(matchingProductIds).filter(id => charMatchingIds.has(id))
              );
            }
          });
          
          if (matchingProductIds !== null) {
            // Фильтруем товары по ID из индекса
            const matchingIdsSet = matchingProductIds;
            filtered = filtered.filter(p => matchingIdsSet.has(p.id));
          } else {
            filtered = [];
          }
        }
      } catch (e) {
        console.error('[API Catalog] Error parsing characteristics:', e);
      }
    }
    
    // Ранний выход если нет товаров после фильтрации по характеристикам
    if (filtered.length === 0) {
      return NextResponse.json({
        products: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    }

    // Шаг 5: Поиск - максимально оптимизированная версия (последний этап)
    if (searchQuery && searchQuery.trim() && filtered.length > 0) {
      const query = searchQuery.toLowerCase().trim();
      
      // Если запрос слишком короткий, пропускаем поиск
      if (query.length < 2) {
        // Слишком короткий запрос
      } else {
        const beforeSearch = filtered.length;
        const queryWords = query.split(/\s+/).filter(w => w.length > 0);
        
        // Оптимизация: предварительно вычисляем нижний регистр для всех слов
        // и используем более эффективную проверку
        if (queryWords.length === 1) {
          // Одно слово - используем более быстрый алгоритм
          const singleWord = queryWords[0];
          filtered = filtered.filter(p => {
            // Проверяем название (самый частый случай)
            if (p.name && p.name.toLowerCase().includes(singleWord)) return true;
            // Проверяем производителя
            if (p.manufacturer && p.manufacturer.toLowerCase().includes(singleWord)) return true;
            // Характеристики проверяем только если название и производитель не подошли
            if (p.characteristics && Array.isArray(p.characteristics)) {
              for (let i = 0; i < p.characteristics.length; i++) {
                const char = p.characteristics[i];
                if (char && char.value && char.value.toLowerCase().includes(singleWord)) {
                  return true;
                }
              }
            }
            return false;
          });
        } else {
          // Несколько слов - используем оптимизированный алгоритм
          filtered = filtered.filter(p => {
            // Приоритет 1: Название (самый быстрый)
            if (p.name) {
              const nameLower = p.name.toLowerCase();
              if (queryWords.every(word => nameLower.includes(word))) {
                return true;
              }
            }
            
            // Приоритет 2: Производитель
            if (p.manufacturer) {
              const manufacturerLower = p.manufacturer.toLowerCase();
              if (queryWords.every(word => manufacturerLower.includes(word))) {
                return true;
              }
            }
            
            // Приоритет 3: Характеристики (проверяем только если предыдущие не подошли)
            if (p.characteristics && Array.isArray(p.characteristics)) {
              for (let i = 0; i < p.characteristics.length; i++) {
                const char = p.characteristics[i];
                if (char && char.value) {
                  const valueLower = char.value.toLowerCase();
                  if (queryWords.every(word => valueLower.includes(word))) {
                    return true;
                  }
                }
              }
            }
            
            return false;
          });
        }
      }
    }

    // Пагинация
    const paginationStart = performance.now();
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = filtered.slice(startIndex, endIndex);
    const totalTime = performance.now() - startTime;
    
    // Логирование только в режиме разработки
    if (process.env.NODE_ENV === 'development' && totalTime > 1000) {
      console.log('[API Catalog] Slow request:', {
        total,
        returned: paginatedProducts.length,
        totalTime: `${totalTime.toFixed(2)}ms`
      });
    }

    return NextResponse.json({
      products: paginatedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate', // Отключаем кэш для актуальных данных
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Ошибка загрузки каталога:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки каталога', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

