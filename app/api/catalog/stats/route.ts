import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { CATEGORIES } from '@/constants/categories';

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
        // Используем константы CATEGORIES для получения правильного slug
        let categorySlug = null;
        if (categoryId) {
          const categoryFromConstants = CATEGORIES.find(cat => cat.id === categoryId);
          if (categoryFromConstants) {
            categorySlug = categoryFromConstants.slug;
          } else {
            // Fallback: используем данные из MongoDB
            const categoryDoc = await categoriesCollection.findOne({ _id: categoryId } as any);
            categorySlug = categoryDoc?.slug || categoryDoc?._id;
          }
        }
        
        // Формируем полный формат subcategoryId: ${categorySlug}-${subcategorySlug}
        // Используем константы CATEGORIES для получения правильного slug
        const subcategoryValues: string[] = [];
        
        for (const subDoc of subcategoryDocs) {
          // Приводим ID к строке для сравнения с константами
          const subId = String(subDoc._id || subDoc.id); // ID подкатегории (например, "2-4")
          
          // Ищем подкатегорию в константах CATEGORIES для получения правильного slug
          let subcategorySlug: string | null = null;
          
          if (categoryId) {
            const categoryFromConstants = CATEGORIES.find(cat => cat.id === categoryId);
            const subFromConstants = categoryFromConstants?.subcategories?.find(
              sub => sub.id === subId
            );
            if (subFromConstants) {
              subcategorySlug = subFromConstants.slug;
            }
          }
          
          // Если не нашли в константах, пробуем использовать slug из MongoDB
          if (!subcategorySlug) {
            subcategorySlug = subDoc.slug || null;
          }
          
          // Если все еще нет slug, пропускаем эту подкатегорию
          if (!subcategorySlug) {
            console.warn(`[API Stats] Не удалось найти slug для подкатегории ${subId}`);
            continue;
          }
          
          // Формируем полный формат: категория-подкатегория
          if (categorySlug) {
            subcategoryValues.push(`${categorySlug}-${subcategorySlug}`);
          } else {
            // Если нет категории, пробуем найти её через subcategory
            const subCategoryId = String(subDoc.categoryId || '');
            if (subCategoryId) {
              const categoryFromConstants = CATEGORIES.find(cat => cat.id === subCategoryId);
              const catSlug = categoryFromConstants?.slug || null;
              
              if (!catSlug) {
                const catDoc = await categoriesCollection.findOne({ _id: subCategoryId } as any);
                const catSlugFromMongo = catDoc?.slug || catDoc?._id || subCategoryId;
                subcategoryValues.push(`${catSlugFromMongo}-${subcategorySlug}`);
              } else {
                subcategoryValues.push(`${catSlug}-${subcategorySlug}`);
              }
            } else {
              // Fallback: используем только slug подкатегории
              subcategoryValues.push(subcategorySlug);
            }
          }
        }
        
        // Используем только slug формат из констант
        const allSubcategoryValues = [...new Set(subcategoryValues)];
        
        // ВРЕМЕННО: используем $regex для поиска товаров с любым форматом subcategoryId
        // который заканчивается на нужный slug подкатегории
        if (allSubcategoryValues.length > 0 && categoryId) {
          const totalSubs = await subcategoriesCollection.countDocuments({ categoryId }, { maxTimeMS: 5000 });
          
          if (allSubcategoryValues.length !== totalSubs && allSubcategoryValues.length > 0) {
            // Создаем список всех возможных slug подкатегорий для regex поиска
            const subcategorySlugs: string[] = [];
            
            for (const subDoc of subcategoryDocs) {
              const subId = String(subDoc._id || subDoc.id);
              const categoryFromConstants = CATEGORIES.find(cat => cat.id === categoryId);
              const subFromConstants = categoryFromConstants?.subcategories?.find(sub => sub.id === subId);
              
              if (subFromConstants) {
                subcategorySlugs.push(subFromConstants.slug);
              }
            }
            
            // Используем $or для поиска: точное совпадение ИЛИ regex (заканчивается на нужный slug)
            const orConditions: any[] = [
              { subcategoryId: { $in: allSubcategoryValues } }
            ];
            
            // Для категории 2 (кофеварки) добавляем кириллические варианты
            // так как в базе товары имеют кириллический формат subcategoryId
            if (categoryId === '2') {
              for (const subDoc of subcategoryDocs) {
                const subId = String(subDoc._id || subDoc.id);
                const categoryFromConstants = CATEGORIES.find(cat => cat.id === categoryId);
                const subFromConstants = categoryFromConstants?.subcategories?.find(sub => sub.id === subId);
                
                if (subFromConstants) {
                  // Генерируем кириллический slug из названия подкатегории
                  // Формат в базе: кофеварки-и-кофемашины-{название}
                  const cyrillicSlug = subFromConstants.name
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-zа-яё0-9-]/gi, '')
                    .replace(/-+/g, '-')
                    .trim();
                  
                  const cyrillicFormat = `кофеварки-и-кофемашины-${cyrillicSlug}`;
                  
                  // Добавляем точное совпадение с кириллическим форматом
                  orConditions.push({ subcategoryId: cyrillicFormat });
                  
                  // Добавляем простой regex для поиска по окончанию
                  // Ищем строки, которые начинаются с "кофеварки-и-кофемашины-" и содержат ключевые слова из названия
                  const keyWords = subFromConstants.name
                    .toLowerCase()
                    .split(/\s+/)
                    .filter(w => w.length > 2 && !['для', 'и', 'или', 'с', 'на', 'в'].includes(w))
                    .map(w => w.replace(/[^a-zа-яё0-9]/gi, ''));
                  
                  if (keyWords.length > 0) {
                    // Простой паттерн: кофеварки-и-кофемашины- + любое из ключевых слов
                    keyWords.forEach(word => {
                      orConditions.push({
                        subcategoryId: { $regex: `^кофеварки-и-кофемашины-.*${word}`, $options: 'i' }
                      });
                    });
                  }
                }
              }
            }
            
            // Добавляем regex паттерны для каждого латинского slug
            for (const subSlug of subcategorySlugs) {
              orConditions.push({
                subcategoryId: { $regex: `-${subSlug}$`, $options: 'i' }
              });
            }
            
            // Добавляем условие в фильтр
            if (filter.$and) {
              filter.$and.push({ $or: orConditions });
            } else {
              filter.$or = orConditions;
            }
          }
        } else {
          if (allSubcategoryValues.length > 0) {
            filter.subcategoryId = { $in: allSubcategoryValues };
          }
        }
        
        const finalSubcategoryValues = allSubcategoryValues;
        
        console.log('[API Stats] Subcategory IDs:', subcategories);
        console.log('[API Stats] Category slug:', categorySlug);
        console.log('[API Stats] Subcategory values for filter:', finalSubcategoryValues);
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
