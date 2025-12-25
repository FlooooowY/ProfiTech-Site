import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { Product } from '@/types';

// Интеграция с OpenRouter API для использования модели MiMo-V2-Flash от Xiaomi
// Для работы нужно добавить OPENROUTER_API_KEY в .env.local
// Получить ключ можно на https://openrouter.ai/

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Можно использовать разные модели:
// 'xiaomi/mimo-v2-flash' - бесплатная, быстрая модель
// 'google/gemini-flash-1.5' - более умная модель от Google (требует API ключ)
// 'openai/gpt-3.5-turbo' - классическая модель OpenAI (требует API ключ)
const MODEL = process.env.OPENROUTER_MODEL || 'xiaomi/mimo-v2-flash';

/**
 * Извлекает уникальные значения характеристик из товаров
 * Например, все объемы холодильников, все мощности и т.д.
 */
function extractCharacteristicsValues(
  products: Product[],
  characteristicName: string
): string[] {
  const values = new Set<string>();
  
  // Маппинг названий характеристик и их синонимов
  const characteristicMap: { [key: string]: string[] } = {
    'объем': ['объем', 'объемы', 'литр', 'литры', 'литров', 'л', 'l', 'volume', 'capacity', 'емкость'],
    'мощность': ['мощность', 'мощности', 'ватт', 'ватты', 'вт', 'w', 'kw', 'power', 'мощн'],
    'размер': ['размер', 'размеры', 'габарит', 'габариты', 'dimension', 'size', 'размерн'],
    'вес': ['вес', 'масса', 'кг', 'килограмм', 'килограммы', 'kg', 'weight', 'масс'],
    'температура': ['температура', 'температуры', 'градус', 'градусы', '°c', '°f', 'temp', 'темп'],
    'напряжение': ['напряжение', 'вольт', 'в', 'v', '220', '380', 'voltage', 'напряж'],
    'производитель': ['производитель', 'бренд', 'марка', 'manufacturer', 'brand', 'произв']
  };
  
  // Получаем ключевые слова для искомой характеристики
  const searchKeywords = characteristicMap[characteristicName] || [characteristicName.toLowerCase()];
  
  products.forEach(product => {
    if (product.characteristics && Array.isArray(product.characteristics)) {
      product.characteristics.forEach(char => {
        if (char && char.name && char.value) {
          const charNameLower = char.name.toLowerCase();
          
          // Проверяем, соответствует ли название характеристики
          const matches = searchKeywords.some(keyword => 
            charNameLower.includes(keyword) || keyword.includes(charNameLower)
          );
          
          if (matches) {
            const value = char.value.trim();
            // Игнорируем пустые значения и значения типа "не указано"
            if (value && 
                !value.toLowerCase().includes('не указан') && 
                !value.toLowerCase().includes('н/д') &&
                !value.toLowerCase().includes('n/a')) {
              
              // Дополнительная фильтрация для объема - только значения с литрами
              if (characteristicName === 'объем') {
                const valueLower = value.toLowerCase();
                // Пропускаем значения с кВт, Вт, напряжением и т.д.
                if (valueLower.includes('квт') || valueLower.includes('вт') || 
                    valueLower.includes('w') || valueLower.includes('kw') ||
                    valueLower.includes('вольт') || valueLower.includes('v') ||
                    valueLower.includes('°c') || valueLower.includes('°f') ||
                    valueLower.includes('бар') || valueLower.includes('bar') ||
                    valueLower.includes('мм') || valueLower.includes('mm')) {
                  // Это не объем, пропускаем
                  return;
                }
                // Принимаем значения с литрами или просто числа (предполагаем литры)
                if (valueLower.includes('л') || valueLower.includes('l') || 
                    valueLower.includes('литр') || /^\d+[\s,.]*\d*$/.test(value)) {
                  values.add(value);
                }
              }
              // Дополнительная фильтрация для размера - исключаем мощности и объемы
              else if (characteristicName === 'размер') {
                const valueLower = value.toLowerCase();
                // Пропускаем значения с кВт, литрами
                if (valueLower.includes('квт') || valueLower.includes('вт') || 
                    valueLower.includes('w') || valueLower.includes('kw') ||
                    valueLower.includes('литр') || valueLower.includes('л') ||
                    valueLower.includes('l')) {
                  return;
                }
                // Принимаем размеры (мм, см, м, дюймы и т.д.)
                if (valueLower.includes('мм') || valueLower.includes('см') || 
                    valueLower.includes('м ') || valueLower.includes('м,') ||
                    valueLower.includes('mm') || valueLower.includes('cm') ||
                    valueLower.includes('inch') || valueLower.includes('дюйм') ||
                    /\d+\s*x\s*\d+/.test(valueLower)) { // Размеры типа "100x50"
                  values.add(value);
                }
              }
              // Для остальных характеристик принимаем все
              else {
                values.add(value);
              }
            }
          }
        }
      });
    }
  });
  
  return Array.from(values).sort((a, b) => {
    // Пытаемся сортировать числовые значения
    const numA = parseFloat(a.replace(/[^\d.,]/g, '').replace(',', '.'));
    const numB = parseFloat(b.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  });
}

/**
 * Определяет, является ли запрос запросом о характеристиках
 * Например: "какие объемы", "какие мощности", "какие размеры"
 */
function isCharacteristicsQuery(query: string): {
  isQuery: boolean;
  characteristicName?: string;
  productType?: string;
} {
  const queryLower = query.toLowerCase();
  
  // Ключевые слова для характеристик и их синонимы
  const characteristicMap: { [key: string]: string[] } = {
    'объем': ['объем', 'объемы', 'литр', 'литры', 'литров', 'л', 'l'],
    'мощность': ['мощность', 'мощности', 'ватт', 'ватты', 'вт', 'w', 'kw'],
    'размер': ['размер', 'размеры', 'габарит', 'габариты', 'dimension'],
    'вес': ['вес', 'масса', 'кг', 'килограмм', 'килограммы', 'kg'],
    'температура': ['температура', 'температуры', 'градус', 'градусы', '°c', '°f'],
    'напряжение': ['напряжение', 'вольт', 'в', 'v', '220', '380'],
    'производитель': ['производитель', 'бренд', 'марка', 'manufacturer', 'brand']
  };
  
  // Паттерны для запросов о характеристиках
  const patterns = [
    /какие\s+(\w+)\s+(\w+)\s+(?:есть|доступны|представлены)/i,
    /какие\s+(\w+)\s+(\w+)/i,
    /(\w+)\s+(\w+)\s+(?:объем|мощность|размер|габарит|параметр)/i,
    // Паттерн для "размеры варочных плит" - характеристика + тип товара
    /(\w+)\s+(\w+)\s+(\w+)/i,
  ];
  
  // Проверяем паттерны
  for (const pattern of patterns) {
    const match = queryLower.match(pattern);
    if (match) {
      const word1 = match[1]?.toLowerCase() || '';
      const word2 = match[2]?.toLowerCase() || '';
      const word3 = match[3]?.toLowerCase() || '';
      
      // Проверяем, является ли одно из слов характеристикой
      for (const [charName, keywords] of Object.entries(characteristicMap)) {
        const isCharInWord1 = keywords.some(keyword => word1.includes(keyword) || keyword.includes(word1));
        const isCharInWord2 = keywords.some(keyword => word2.includes(keyword) || keyword.includes(word2));
        
        if (isCharInWord1 || isCharInWord2) {
          // Определяем тип товара
          let productType: string | undefined;
          
          // Нормализация типов товаров (убираем окончания падежей)
          const normalizeProductType = (word: string): string => {
            const typeMap: { [key: string]: string } = {
              'холодильника': 'холодильник',
              'холодильники': 'холодильник',
              'холодильников': 'холодильник',
              'морозилки': 'морозилк',
              'морозилок': 'морозилк',
              'печи': 'печь',
              'печей': 'печь',
              'плиты': 'плит',
              'плит': 'плит',
              'панели': 'панел',
              'панелей': 'панел',
              'варочных': 'варочн',
              'варочные': 'варочн',
              'кофемашины': 'кофемашин',
              'кофемашин': 'кофемашин',
              'кофеварки': 'кофеварк',
              'кофеварок': 'кофеварк'
            };
            return typeMap[word] || word;
          };
          
          // Если характеристика в первом слове, тип во втором или третьем
          if (isCharInWord1) {
            if (word2 && !keywords.some(k => word2.includes(k))) {
              productType = normalizeProductType(word2);
            } else if (word3 && !keywords.some(k => word3.includes(k))) {
              productType = normalizeProductType(word3);
            }
          } else if (isCharInWord2) {
            // Если характеристика во втором слове, тип в первом или третьем
            if (word1 && !keywords.some(k => word1.includes(k))) {
              productType = normalizeProductType(word1);
            } else if (word3 && !keywords.some(k => word3.includes(k))) {
              productType = normalizeProductType(word3);
            }
          }
          
          // Если тип не определен, пытаемся найти его в запросе
          if (!productType) {
            // Проверяем весь запрос на наличие типов товаров (с учетом разных падежей)
            const productKeywordsMap: { [key: string]: string } = {
              'холодильник': 'холодильник',
              'холодильника': 'холодильник',
              'холодильники': 'холодильник',
              'морозилк': 'морозилк',
              'морозилки': 'морозилк',
              'печь': 'печь',
              'печи': 'печь',
              'плит': 'плит',
              'плиты': 'плит',
              'панел': 'панел',
              'панели': 'панел',
              'варочн': 'варочн',
              'варочных': 'варочн',
              'кофемашин': 'кофемашин',
              'кофемашины': 'кофемашин',
              'кофеварк': 'кофеварк',
              'кофеварки': 'кофеварк',
              'бар': 'бар',
              'мебель': 'мебель',
              'витрин': 'витрин',
              'витрины': 'витрин',
              'шкаф': 'шкаф',
              'шкафы': 'шкаф'
            };
            
            // Ищем совпадения в запросе
            for (const [keyword, baseType] of Object.entries(productKeywordsMap)) {
              if (queryLower.includes(keyword)) {
                // Если нашли "варочн" или "плит", объединяем их
                if (baseType === 'варочн' && queryLower.includes('плит')) {
                  productType = 'варочн плит';
                } else if (baseType === 'плит' && queryLower.includes('варочн')) {
                  productType = 'варочн плит';
                } else {
                  productType = baseType;
                }
                break;
              }
            }
          } else {
            // Если тип определен, но в запросе есть дополнительные слова, объединяем их
            if (productType === 'варочн' && queryLower.includes('плит')) {
              productType = 'варочн плит';
            } else if (productType === 'плит' && queryLower.includes('варочн')) {
              productType = 'варочн плит';
            }
          }
          
          return {
            isQuery: true,
            characteristicName: charName,
            productType: productType
          };
        }
      }
    }
  }
  
  // Проверяем прямые упоминания характеристик
  for (const [charName, keywords] of Object.entries(characteristicMap)) {
    if (keywords.some(keyword => queryLower.includes(keyword))) {
      if (queryLower.includes('какие') || queryLower.includes('есть') || queryLower.includes('доступны')) {
        // Пытаемся определить тип товара из запроса
        let productType: string | undefined;
        const queryWords = queryLower.split(/\s+/);
        // Расширенный список ключевых слов для типов товаров
        const productKeywords = [
          'холодильник', 'морозилк', 'печь', 'кофемашин', 'кофеварк', 'бар', 'мебель',
          'плит', 'панел', 'варочн', 'конвекционн', 'ротационн', 'тестомес', 'миксер',
          'витрин', 'шкаф', 'стол', 'пекарн', 'кондитерск', 'оборудован'
        ];
        for (const word of queryWords) {
          if (productKeywords.some(pk => word.includes(pk))) {
            productType = word;
            break;
          }
        }
        
        return {
          isQuery: true,
          characteristicName: charName,
          productType: productType
        };
      }
    }
  }
  
  return { isQuery: false };
}

/**
 * Умный поиск товаров по запросу клиента
 */
async function searchProductsByQuery(query: string): Promise<{
  products: Product[];
  suggestedCategory?: string;
  suggestedCategoryId?: string;
  suggestedSubcategoryId?: string;
  suggestedLink?: string;
  characteristicsData?: { name: string; values: string[] };
}> {
  const queryLower = query.toLowerCase().trim();
  
  // Если запрос слишком короткий, возвращаем пустой результат
  if (queryLower.length < 2) {
    return { products: [] };
  }

  try {
    const productsCollection = await getCollection<Product>('products');
    
    // Проверяем, является ли это запросом о характеристиках
    const charQuery = isCharacteristicsQuery(query);
    
    if (charQuery.isQuery) {
      // Это запрос о характеристиках (например, "какие объемы холодильников есть")
      // Сначала находим товары по типу (если указан)
      let productsToAnalyze: Product[] = [];
      
      if (charQuery.productType) {
        // Ищем товары по типу - более точный поиск
        const typeKeyword = charQuery.productType.toLowerCase();
        
        // Маппинг типов товаров на ключевые слова для поиска
        const productTypeMap: { [key: string]: string[] } = {
          'холодильник': ['холодильник', 'морозилк', 'холодильн', 'refrigerator', 'freezer'],
          'морозилк': ['морозилк', 'холодильник', 'freezer'],
          'плит': ['плит', 'панел', 'варочн', 'plate', 'cooktop'],
          'панел': ['панел', 'плит', 'варочн', 'panel', 'cooktop'],
          'варочн': ['варочн', 'плит', 'панел', 'cooktop'],
          'варочн плит': ['варочн', 'плит', 'панел', 'cooktop', 'plate'],
          'печь': ['печь', 'печ', 'oven', 'furnace'],
          'кофемашин': ['кофемашин', 'кофеварк', 'coffee', 'espresso'],
          'кофеварк': ['кофеварк', 'кофемашин', 'coffee'],
          'бар': ['бар', 'bar'],
          'мебель': ['мебель', 'стол', 'шкаф', 'furniture'],
          'витрин': ['витрин', 'display', 'showcase'],
          'шкаф': ['шкаф', 'cabinet', 'cupboard']
        };
        
        // Получаем ключевые слова для поиска
        const searchKeywords = productTypeMap[typeKeyword] || typeKeyword.split(/\s+/);
        
        // Создаем условия поиска
        const searchConditions: any[] = [];
        
        // Для многословных типов (например, "варочн плит") ищем товары, где есть ВСЕ ключевые слова
        if (typeKeyword.includes(' ')) {
          const typeWords = typeKeyword.split(/\s+/);
          const allWordsPattern = typeWords.map(w => `(?=.*${w})`).join('');
          searchConditions.push({ name: { $regex: new RegExp(allWordsPattern, 'i') } });
          searchConditions.push({ description: { $regex: new RegExp(allWordsPattern, 'i') } });
        } else {
          // Для однословных типов ищем по любому из ключевых слов
          searchKeywords.forEach(keyword => {
            searchConditions.push({ name: { $regex: new RegExp(keyword, 'i') } });
            searchConditions.push({ description: { $regex: new RegExp(keyword, 'i') } });
          });
        }
        
        // Также ищем по подкатегориям, если это известный тип
        if (typeKeyword.includes('холодильник') || typeKeyword.includes('морозилк')) {
          searchConditions.push({ subcategoryId: { $regex: /holodil|холодильн/i } });
        } else if (typeKeyword.includes('плит') || typeKeyword.includes('панел') || typeKeyword.includes('варочн')) {
          searchConditions.push({ subcategoryId: { $regex: /teplovoe|теплов/i } });
        } else if (typeKeyword.includes('печь')) {
          searchConditions.push({ 
            $or: [
              { subcategoryId: { $regex: /hlebopekarnoe|хлебопекарн/i } },
              { subcategoryId: { $regex: /konditerskoe|кондитерск/i } },
              { subcategoryId: { $regex: /teplovoe|теплов/i } }
            ]
          });
        }
        
        productsToAnalyze = await productsCollection
          .find({ $or: searchConditions })
          .limit(200)
          .toArray();
        
        // Сортируем результаты: сначала товары с точным совпадением всех слов типа
        if (typeKeyword.includes(' ')) {
          const typeWords = typeKeyword.split(/\s+/);
          productsToAnalyze.sort((a, b) => {
            const aNameLower = a.name.toLowerCase();
            const bNameLower = b.name.toLowerCase();
            const aExactMatch = typeWords.every(w => aNameLower.includes(w));
            const bExactMatch = typeWords.every(w => bNameLower.includes(w));
            
            if (aExactMatch && !bExactMatch) return -1;
            if (!aExactMatch && bExactMatch) return 1;
            return 0;
          });
        }
      } else {
        // Если тип не указан, пытаемся определить по запросу
        const queryLower = query.toLowerCase();
        let categoryFilter: any = {};
        
        if (queryLower.includes('холодильн') || queryLower.includes('морозилк')) {
          categoryFilter = { categoryId: '1', subcategoryId: { $regex: /holodil|холодильн/i } };
        } else if (queryLower.includes('пекарн') || queryLower.includes('хлебопекарн')) {
          categoryFilter = { categoryId: '1', subcategoryId: { $regex: /hlebopekarnoe|хлебопекарн/i } };
        } else if (queryLower.includes('кофе') || queryLower.includes('кофемашин')) {
          categoryFilter = { categoryId: '2' };
        } else if (queryLower.includes('бар')) {
          categoryFilter = { categoryId: '1', subcategoryId: { $regex: /bar|бар/i } };
        }
        
        if (Object.keys(categoryFilter).length > 0) {
          productsToAnalyze = await productsCollection
            .find(categoryFilter)
            .limit(100)
            .toArray();
        } else {
          // Берем все товары, если тип не определен
          productsToAnalyze = await productsCollection
            .find({})
            .limit(200)
            .toArray();
        }
      }
      
      // Извлекаем значения характеристик
      const characteristicName = charQuery.characteristicName || 'объем';
      const values = extractCharacteristicsValues(productsToAnalyze, characteristicName);
      
      // Определяем категорию для ссылки
      let suggestedLink: string | undefined;
      if (productsToAnalyze.length > 0) {
        const firstProduct = productsToAnalyze[0];
        if (firstProduct.subcategoryId) {
          suggestedLink = `/catalog?categoryId=${firstProduct.categoryId}&subcategories=${firstProduct.subcategoryId}`;
        } else {
          suggestedLink = `/catalog?categoryId=${firstProduct.categoryId}`;
        }
      }
      
      return {
        products: productsToAnalyze.slice(0, 10),
        suggestedLink,
        characteristicsData: {
          name: characteristicName,
          values: values
        }
      };
    }
    
    // Обычный поиск товаров
    // Извлекаем ключевые слова из запроса (исключаем стоп-слова)
    const stopWords = ['для', 'какой', 'какая', 'какое', 'какие', 'нужен', 'нужна', 'нужно', 'нужны', 
                       'хочу', 'хотят', 'интересует', 'интересуют', 'посоветуйте', 'подберите', 
                       'найти', 'найти', 'купить', 'стоимость', 'цена', 'сколько', 'есть', 'у вас', 'алло'];
    
    const keywords = queryLower
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    if (keywords.length === 0) {
      return { products: [] };
    }

    // Создаем поисковый запрос с приоритетом на название
    // Сначала ищем товары, где ВСЕ ключевые слова есть в названии (более точное совпадение)
    const allKeywordsPattern = keywords.map(k => `(?=.*${k})`).join('');
    
    // Поиск по названию с приоритетом (все слова должны быть в названии)
    const exactNameMatch = {
      name: { $regex: new RegExp(allKeywordsPattern, 'i') }
    };
    
    // Поиск по названию (хотя бы одно слово)
    const nameMatch = {
      name: { $regex: new RegExp(keywords.join('|'), 'i') }
    };
    
    // Поиск по описанию
    const descriptionMatch = {
      description: { $regex: new RegExp(keywords.join('|'), 'i') }
    };

    // Сначала ищем точные совпадения в названии
    let foundProducts = await productsCollection
      .find(exactNameMatch)
      .limit(20)
      .toArray();
    
    // Если точных совпадений мало, добавляем товары с совпадением хотя бы одного слова в названии
    if (foundProducts.length < 5) {
      const foundProductIds = new Set(foundProducts.map(p => p.id));
      
      const additionalProducts = await productsCollection
        .find({ 
          $or: [nameMatch, descriptionMatch]
        })
        .limit(20)
        .toArray();
      
      // Фильтруем дубликаты по ID
      const uniqueAdditionalProducts = additionalProducts.filter(p => !foundProductIds.has(p.id));
      
      foundProducts = [...foundProducts, ...uniqueAdditionalProducts];
    }
    
    // Сортируем результаты: сначала товары с точным совпадением в названии
    foundProducts.sort((a, b) => {
      const aNameLower = a.name.toLowerCase();
      const bNameLower = b.name.toLowerCase();
      const aExactMatch = keywords.every(k => aNameLower.includes(k));
      const bExactMatch = keywords.every(k => bNameLower.includes(k));
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      return 0;
    });
    
    foundProducts = foundProducts.slice(0, 10);

    // Определяем категорию на основе найденных товаров или ключевых слов
    let suggestedCategory: string | undefined;
    let suggestedCategoryId: string | undefined;
    let suggestedSubcategoryId: string | undefined;
    let suggestedLink: string | undefined;

    // Если нашли товары, определяем категорию по первому товару
    if (foundProducts.length > 0) {
      const firstProduct = foundProducts[0];
      suggestedCategoryId = firstProduct.categoryId;
      suggestedSubcategoryId = firstProduct.subcategoryId;
      
      // Формируем ссылку на каталог
      if (suggestedSubcategoryId) {
        suggestedLink = `/catalog?categoryId=${suggestedCategoryId}&subcategories=${suggestedSubcategoryId}`;
      } else {
        suggestedLink = `/catalog?categoryId=${suggestedCategoryId}`;
      }
    } else {
      // Если товары не найдены, пытаемся определить категорию по ключевым словам
      const queryLower = query.toLowerCase();
      
      if (queryLower.includes('пекарн') || queryLower.includes('хлебопекарн') || queryLower.includes('хлеб')) {
        suggestedCategory = 'Хлебопекарное оборудование';
        suggestedCategoryId = '1';
        suggestedSubcategoryId = '1-4';
        suggestedLink = '/catalog?categoryId=1&subcategories=1-4';
      } else if (queryLower.includes('кондитер') || queryLower.includes('торт')) {
        suggestedCategory = 'Кондитерское оборудование';
        suggestedCategoryId = '1';
        suggestedSubcategoryId = '1-5';
        suggestedLink = '/catalog?categoryId=1&subcategories=1-5';
      } else if (queryLower.includes('кофе') || queryLower.includes('кофемашин') || queryLower.includes('кофеварк')) {
        suggestedCategory = 'Кофеварки и кофемашины';
        suggestedCategoryId = '2';
        suggestedLink = '/catalog?categoryId=2';
      } else if (queryLower.includes('холодильн') || queryLower.includes('морозилк')) {
        suggestedCategory = 'Холодильное оборудование';
        suggestedCategoryId = '1';
        suggestedSubcategoryId = '1-2';
        suggestedLink = '/catalog?categoryId=1&subcategories=1-2';
      } else if (queryLower.includes('бар') || queryLower.includes('коктейл')) {
        suggestedCategory = 'Оборудование для баров';
        suggestedCategoryId = '1';
        suggestedSubcategoryId = '1-6';
        suggestedLink = '/catalog?categoryId=1&subcategories=1-6';
      } else if (queryLower.includes('мебель')) {
        suggestedCategory = 'Промышленная мебель';
        suggestedCategoryId = '3';
        suggestedLink = '/catalog?categoryId=3';
      } else if (queryLower.includes('климат') || queryLower.includes('кондиционер') || queryLower.includes('вентиляц')) {
        suggestedCategory = 'Климатическая техника';
        suggestedCategoryId = '4';
        suggestedLink = '/catalog?categoryId=4';
      }
    }

    return {
      products: foundProducts,
      suggestedCategory,
      suggestedCategoryId,
      suggestedSubcategoryId,
      suggestedLink
    };
  } catch (error) {
    console.error('Error searching products:', error);
    return { products: [] };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, messages: conversationHistory = [] } = await request.json();

    // Проверяем наличие и валидность API ключа
    const apiKey = process.env.OPENROUTER_API_KEY;
    const hasValidApiKey = apiKey && apiKey.trim().length > 0;
    
    // Ищем товары по запросу клиента
    const searchResult = await searchProductsByQuery(message);
    const { products: foundProducts, suggestedCategory, suggestedCategoryId, suggestedSubcategoryId, suggestedLink, characteristicsData } = searchResult;
    
    // Если это запрос о характеристиках, обрабатываем его специальным образом
    if (characteristicsData && characteristicsData.values.length > 0) {
      // Форматируем список значений
      let valuesList = '';
      if (characteristicsData.values.length <= 10) {
        // Если значений немного, показываем списком
        valuesList = characteristicsData.values.map((v, i) => `${i + 1}. ${v}`).join('\n');
      } else {
        // Если значений много, показываем через запятую
        valuesList = characteristicsData.values.slice(0, 20).join(', ');
        if (characteristicsData.values.length > 20) {
          valuesList += ` и еще ${characteristicsData.values.length - 20} вариантов`;
        }
      }
      
      // Определяем правильное название характеристики для ответа
      const charDisplayNames: { [key: string]: string } = {
        'объем': 'объемы',
        'мощность': 'мощности',
        'размер': 'размеры',
        'вес': 'веса',
        'температура': 'температуры',
        'напряжение': 'напряжения',
        'производитель': 'производители'
      };
      
      const displayName = charDisplayNames[characteristicsData.name] || characteristicsData.name;
      const response = `В нашем каталоге представлены следующие ${displayName}:\n\n${valuesList}`;
      
      if (suggestedLink) {
        return NextResponse.json({
          success: true,
          message: `${response}\n\n📦 Посмотреть все товары в каталоге: ${suggestedLink}`,
          suggestedLink
        });
      }
      
      return NextResponse.json({
        success: true,
        message: response
      });
    }
    
    // Если API ключ отсутствует или невалидный, используем fallback
    if (!hasValidApiKey) {
      // Fallback на простую логику, если API ключ не установлен
      return await getFallbackResponse(message, conversationHistory, foundProducts, suggestedLink);
    }

    // Анализируем намерение клиента из контекста разговора
    const conversationContext = conversationHistory.slice(-6).map((m: { role: string; content: string }) => m.content).join(' ');
    const fullContext = `${conversationContext} ${message}`.toLowerCase();
    
    // Определяем тип запроса
    const isGreeting = /привет|здравств|добр|hi|hello/i.test(message);
    const isQuestion = /как|что|где|когда|почему|зачем|сколько|какой|какая|какое|какие/i.test(message);
    const isProductSearch = /нужен|нужна|нужно|нужны|хочу|интересует|ищу|ищем|подбери|посоветуй|найди/i.test(message);
    const isPriceQuery = /цена|стоимость|сколько стоит|прайс|стоит/i.test(fullContext);
    const isDeliveryQuery = /доставк|доставить|привезти|срок/i.test(fullContext);
    const isWarrantyQuery = /гарант|ремонт|обслуживание|сервис/i.test(fullContext);
    
    // Формируем системный промпт с контекстом
    let systemPrompt = `Ты - профессиональный и дружелюбный консультант интернет-магазина ProfiTech, специализирующегося на профессиональном оборудовании для предприятий общественного питания, пекарен, кондитерских, баров и других бизнесов.

ТВОЯ РОЛЬ:
Ты помогаешь клиентам найти подходящее оборудование, отвечаешь на вопросы, даешь рекомендации. Ты общаешься естественно, как живой человек, но всегда профессионально.

КАТЕГОРИИ ТОВАРОВ В КАТАЛОГЕ:
1. Профоборудование:
   - Хлебопекарное: печи для хлеба (ротационные, конвекционные, каменные), тестомесы, расстоечные шкафы, формы для выпечки, делители теста
   - Кондитерское: кондитерские печи, миксеры, тестомесы, оборудование для работы с шоколадом, формы для выпечки
   - Холодильное: холодильники, морозильники, витрины, шоковые морозильники, холодильные камеры
   - Тепловое: печи, плиты, варочные панели, грили, фритюрницы, пароконвектоматы
   - Для баров: льдогенераторы, блендеры, шейкеры, барные холодильники, соковыжималки
   - Электромеханическое: миксеры, тестомесы, мясорубки
   - Посудомоечное: посудомоечные машины, мойки
   - И другое профессиональное оборудование

2. Кофеварки и кофемашины: автоматические кофемашины, эспрессо-машины, кофемолки, аксессуары для кофе
3. Промышленная мебель: столы, шкафы, тележки, верстаки для кухни, зала, бара, офиса
4. Климатическая техника: вентиляция, кондиционеры, обогреватели, воздухоочистители
5. Телекоммуникационное оборудование: серверные шкафы, телекоммуникационные шкафы
6. Точки продаж (POS-системы): микромаркеты, продуктоматы
7. Бытовая техника: встраиваемая техника для дома

ПРАВИЛА ОБЩЕНИЯ:
1. ВЕДИ ЕСТЕСТВЕННЫЙ ДИАЛОГ:
   - Если клиент поздоровался - поздоровайся в ответ
   - Если клиент задает вопрос - отвечай конкретно на этот вопрос
   - Если клиент ищет товар - помоги найти подходящие варианты
   - Используй контекст предыдущих сообщений в разговоре
   - Отвечай так, как общается живой консультант

2. БУДЬ КОНКРЕТНЫМ:
   - Всегда используй реальные данные о товарах из каталога
   - Если товары найдены - назови их конкретные названия и характеристики
   - Не используй общие фразы типа "у нас большой выбор" без конкретики
   - Не говори "расскажите подробнее" - лучше задай уточняющий вопрос или предложи варианты

3. АНАЛИЗИРУЙ ЗАПРОС:
   - Понимай, что именно хочет клиент
   - Если клиент спрашивает про конкретный товар - дай информацию о нем
   - Если клиент спрашивает про категорию - расскажи про эту категорию
   - Если клиент спрашивает про характеристики - дай конкретные значения

4. ОТВЕЧАЙ НА ВОПРОСЫ:
   - Про цены: "Цены уточняются у менеджеров через WhatsApp, так как они индивидуальны"
   - Про доставку: "Доставка по всей России, сроки и стоимость рассчитываются индивидуально"
   - Про гарантию: "На все оборудование предоставляется гарантия производителя"
   - Про наличие: используй данные из каталога

5. НЕ ДЕЛАЙ:
   - Не повторяй один и тот же ответ на разные вопросы
   - Не используй шаблонные фразы без контекста
   - Не игнорируй предыдущие сообщения в разговоре
   - Не давай информацию, которой нет в каталоге

ВАЖНАЯ ИНФОРМАЦИЯ:
- Цены не указаны на сайте, их нужно уточнять у менеджеров через WhatsApp
- Всегда предлагай перейти в каталог для просмотра товаров
- Будь полезным и дружелюбным`;

    // Добавляем контекст о типе запроса
    if (isGreeting) {
      systemPrompt += `\n\nКОНТЕКСТ: Клиент поздоровался. Поздоровайся в ответ и предложи помощь.`;
    } else if (isPriceQuery) {
      systemPrompt += `\n\nКОНТЕКСТ: Клиент спрашивает про цены. Объясни, что цены индивидуальны и уточняются у менеджеров через WhatsApp.`;
    } else if (isDeliveryQuery) {
      systemPrompt += `\n\nКОНТЕКСТ: Клиент спрашивает про доставку. Расскажи, что доставка по всей России, сроки и стоимость рассчитываются индивидуально.`;
    } else if (isWarrantyQuery) {
      systemPrompt += `\n\nКОНТЕКСТ: Клиент спрашивает про гарантию или сервис. Расскажи про гарантию производителя и сервисное обслуживание.`;
    } else if (isProductSearch) {
      systemPrompt += `\n\nКОНТЕКСТ: Клиент ищет товар. Помоги найти подходящие варианты из каталога.`;
    } else if (isQuestion) {
      systemPrompt += `\n\nКОНТЕКСТ: Клиент задает вопрос. Ответь конкретно на этот вопрос, используя информацию из каталога.`;
    }
    
    // Добавляем контекст о найденных товарах
    if (foundProducts.length > 0) {
      systemPrompt += `\n\nНАЙДЕННЫЕ ТОВАРЫ В КАТАЛОГЕ:\n`;
      foundProducts.slice(0, 8).forEach((product, index) => {
        systemPrompt += `\n${index + 1}. ${product.name}`;
        if (product.manufacturer && product.manufacturer !== 'Не указан') {
          systemPrompt += `\n   Производитель: ${product.manufacturer}`;
        }
        if (product.characteristics && product.characteristics.length > 0) {
          systemPrompt += `\n   Характеристики:`;
          product.characteristics.slice(0, 3).forEach(char => {
            if (char && char.name && char.value) {
              systemPrompt += `\n   - ${char.name}: ${char.value}`;
            }
          });
        }
        systemPrompt += '\n';
      });
      
      if (foundProducts.length > 8) {
        systemPrompt += `\nИ еще ${foundProducts.length - 8} товар(ов) в каталоге.\n`;
      }
      
      systemPrompt += `\nОБЯЗАТЕЛЬНО: Используй эти конкретные товары в своем ответе. Назови их названия и основные характеристики. Покажи клиенту, что у нас действительно есть то, что он ищет.`;
      
      if (suggestedLink) {
        systemPrompt += `\n\nСсылка на каталог: ${suggestedLink} - обязательно предложи перейти туда.`;
      }
    } else if (suggestedCategory) {
      systemPrompt += `\n\nКОНТЕКСТ: Клиент спрашивает про "${suggestedCategory}".`;
      systemPrompt += `\n\nХотя конкретные товары не найдены по запросу, предложи клиенту посмотреть эту категорию в каталоге. Расскажи, что там можно найти.`;
      
      if (suggestedLink) {
        systemPrompt += `\n\nСсылка на категорию: ${suggestedLink}`;
      }
    } else {
      systemPrompt += `\n\nКОНТЕКСТ: Товары по запросу не найдены. Помоги клиенту уточнить запрос или предложи посмотреть каталог.`;
    }
    
    // Добавляем контекст предыдущих сообщений
    if (conversationHistory.length > 0) {
      systemPrompt += `\n\nПРЕДЫДУЩИЙ КОНТЕКСТ РАЗГОВОРА:`;
      conversationHistory.slice(-4).forEach((msg, idx) => {
        if (msg.role === 'user') {
          systemPrompt += `\nКлиент: ${msg.content}`;
        } else if (msg.role === 'assistant') {
          systemPrompt += `\nТы: ${msg.content.substring(0, 100)}...`;
        }
      });
      systemPrompt += `\n\nИспользуй этот контекст для понимания, о чем идет разговор.`;
    }
    
    systemPrompt += `\n\nТЕКУЩИЙ ЗАПРОС КЛИЕНТА: "${message}"\n\nОтветь на этот запрос естественно, используя всю предоставленную информацию.`;

    // Формируем массив сообщений для контекста
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), // Берем последние 10 сообщений для контекста
      { role: 'user', content: message }
    ];

    // Отправляем запрос к OpenRouter API
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://profitech.store',
        'X-Title': 'ProfiTech AI Assistant',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: 0.8, // Немного выше для более естественных ответов
        max_tokens: 800, // Увеличено для более развернутых ответов
        top_p: 0.9,
        frequency_penalty: 0.3, // Снижает повторения
        presence_penalty: 0.3, // Поощряет разнообразие тем
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      const errorStatus = response.status;
      
      // Обрабатываем ошибки авторизации (401) - неверный ключ
      if (errorStatus === 401) {
        console.warn('OpenRouter API: Invalid API key (401). Using fallback logic.');
        // Fallback на простую логику при ошибке авторизации
        return await getFallbackResponse(message, conversationHistory, foundProducts, suggestedLink);
      }
      
      // Обрабатываем другие ошибки API
      console.error(`OpenRouter API Error (${errorStatus}):`, errorData);
      
      // Fallback на простую логику при любой ошибке API
      return await getFallbackResponse(message, conversationHistory, foundProducts, suggestedLink);
    }

    const data = await response.json();
    
    // Проверяем, есть ли ошибка в ответе
    if (data.error) {
      console.error('OpenRouter API Error in response:', data.error);
      // Если ошибка авторизации, используем fallback
      if (data.error.code === 401 || data.error.message?.includes('User not found')) {
        console.warn('OpenRouter API: Invalid API key. Using fallback logic.');
        return await getFallbackResponse(message, conversationHistory, foundProducts, suggestedLink);
      }
      // Для других ошибок тоже используем fallback
      return await getFallbackResponse(message, conversationHistory, foundProducts, suggestedLink);
    }
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      let aiResponse = data.choices[0].message.content;
      
      // Добавляем ссылку на каталог, если она была определена и еще не упомянута в ответе
      if (suggestedLink && !aiResponse.includes('/catalog') && !aiResponse.includes(suggestedLink)) {
        aiResponse += `\n\n📦 Посмотреть товары в каталоге: ${suggestedLink}`;
      }
      
      return NextResponse.json({ 
        success: true, 
        message: aiResponse,
        suggestedLink: suggestedLink || null
      });
    } else {
      console.error('Unexpected response format:', data);
      return await getFallbackResponse(message, conversationHistory, foundProducts, suggestedLink);
    }

  } catch (error) {
    console.error('AI Chat Error:', error);
    // Fallback на простую логику при любой ошибке
    try {
      const body = await request.json();
      const searchResult = await searchProductsByQuery(body.message || '');
      return await getFallbackResponse(
        body.message || '', 
        body.messages || [], 
        searchResult.products, 
        searchResult.suggestedLink
      );
    } catch (e) {
      return await getFallbackResponse('', [], [], undefined);
    }
  }
}

// Fallback функция с простой логикой (используется если API недоступен)
async function getFallbackResponse(
  message: string, 
  conversationHistory: any[] = [],
  foundProducts: Product[] = [],
  suggestedLink?: string
) {
  const messageLower = message.toLowerCase();
  let response = '';
  
  // Анализируем тип запроса
  const isGreeting = /привет|здравств|добр|hi|hello/i.test(message);
  const isPriceQuery = /цена|стоимость|сколько стоит|прайс|стоит/i.test(messageLower);
  const isDeliveryQuery = /доставк|доставить|привезти|срок/i.test(messageLower);
  const isWarrantyQuery = /гарант|ремонт|обслуживание|сервис/i.test(messageLower);
  
  // Обрабатываем приветствие
  if (isGreeting) {
    response = 'Здравствуйте! Я консультант интернет-магазина ProfiTech. Чем могу помочь? Могу помочь подобрать оборудование, ответить на вопросы о товарах или помочь с выбором.';
    return NextResponse.json({ success: true, message: response });
  }
  
  // Обрабатываем запросы о ценах
  if (isPriceQuery) {
    response = 'Цены на оборудование уточняются у наших менеджеров через WhatsApp, так как они индивидуальны и зависят от многих факторов (объем заказа, регион доставки, комплектация и т.д.). Вы можете добавить интересующие товары в корзину и оформить запрос - мы свяжемся с вами и предоставим актуальное коммерческое предложение.';
    return NextResponse.json({ success: true, message: response });
  }
  
  // Обрабатываем запросы о доставке
  if (isDeliveryQuery) {
    response = 'Мы осуществляем доставку по всей России. Сроки и стоимость доставки рассчитываются индивидуально в зависимости от региона и объема заказа. Для уточнения деталей доставки свяжитесь с нашими менеджерами через WhatsApp.';
    return NextResponse.json({ success: true, message: response });
  }
  
  // Обрабатываем запросы о гарантии
  if (isWarrantyQuery) {
    response = 'На все оборудование предоставляется гарантия производителя. Срок гарантии зависит от конкретной модели и производителя. Также мы предлагаем сервисное обслуживание и консультации по эксплуатации. Подробности уточняйте у менеджера.';
    return NextResponse.json({ success: true, message: response });
  }
  
  // Если товары уже найдены, используем их
  if (foundProducts.length === 0) {
    // Пытаемся найти товары по запросу
    try {
      const productsCollection = await getCollection<Product>('products');
      
      // Извлекаем ключевые слова из запроса
      const stopWords = ['для', 'какой', 'какая', 'какое', 'какие', 'нужен', 'нужна', 'нужно', 'нужны', 
                         'хочу', 'хотят', 'интересует', 'интересуют', 'посоветуйте', 'подберите', 
                         'найти', 'купить', 'стоимость', 'цена', 'сколько', 'есть', 'у вас'];
      
      const keywords = messageLower
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word));
      
      if (keywords.length > 0) {
        const searchQuery: any = {
          $or: [
            { name: { $regex: new RegExp(keywords.join('|'), 'i') } },
            { description: { $regex: new RegExp(keywords.join('|'), 'i') } },
            { manufacturer: { $regex: new RegExp(keywords.join('|'), 'i') } }
          ]
        };
        
        // Если упоминается объем (например, "25 литров")
        const volumeMatch = messageLower.match(/(\d+)\s*(литр|л|liters?|l)/i);
        if (volumeMatch) {
          const volume = volumeMatch[1];
          searchQuery.$or.push({
            'characteristics.value': { $regex: new RegExp(volume, 'i') }
          });
        }
        
        foundProducts = await productsCollection
          .find(searchQuery)
          .limit(5)
          .toArray();
      }
    } catch (e) {
      console.error('Error searching products:', e);
    }
  }
  
  // Формируем ответ на основе найденных товаров
  if (foundProducts.length > 0) {
    // Анализируем контекст предыдущих сообщений
    const hasContext = conversationHistory.length > 0;
    const contextText = hasContext ? 'по вашему запросу' : 'в нашем каталоге';
    
    const productList = foundProducts.slice(0, 5).map((p, index) => {
      let productInfo = `${index + 1}. ${p.name}`;
      if (p.manufacturer && p.manufacturer !== 'Не указан') {
        productInfo += ` (${p.manufacturer})`;
      }
      if (p.characteristics && p.characteristics.length > 0) {
        const mainChars = p.characteristics.slice(0, 2).filter(c => c && c.name && c.value);
        if (mainChars.length > 0) {
          productInfo += `\n   ${mainChars.map(c => `${c.name}: ${c.value}`).join(', ')}`;
        }
      }
      return productInfo;
    }).join('\n\n');
    
    response = `Отлично! Я нашел для вас подходящие товары ${contextText}:\n\n${productList}`;
    
    if (foundProducts.length > 5) {
      response += `\n\nИ еще ${foundProducts.length - 5} товар(ов) в каталоге.`;
    }
    
    response += `\n\nВы можете посмотреть подробную информацию о каждом товаре, перейдя в каталог.`;
    
    if (suggestedLink) {
      response += `\n\n📦 Посмотреть все товары: ${suggestedLink}`;
    } else {
      response += `\n\n📦 Посмотреть каталог: /catalog`;
    }
    
    response += `\n\nДля уточнения цен и оформления заказа свяжитесь с нашими менеджерами через WhatsApp.`;
  } else if (messageLower.includes('кофе') || messageLower.includes('кофемашин')) {
    response = 'Отличный выбор! У нас широкий ассортимент кофейного оборудования. Рекомендую обратить внимание на раздел "Кофеварки и кофемашины". Там вы найдете профессиональные кофемашины, кофемолки и все необходимые аксессуары. Что именно вас интересует: автоматические кофемашины, профессиональные эспрессо-машины или может быть кофемолки?';
  } else if (messageLower.includes('холодильн')) {
    response = 'Для холодильного оборудования у нас есть специальный раздел в категории "Профоборудование". Мы предлагаем промышленные холодильники различных объемов и конфигураций. Посмотрите все варианты в каталоге: /catalog?categoryId=1&subcategories=1-2';
  } else if (messageLower.includes('бар') || messageLower.includes('барн')) {
    response = 'Для оснащения бара у нас есть специализированный раздел "Оборудование для баров" в категории профоборудования. Там вы найдете льдогенераторы, блендеры, барные холодильники и многое другое. Посмотрите все товары: /catalog?categoryId=1&subcategories=1-6';
  } else if (messageLower.includes('пекарн') || messageLower.includes('хлебопекарн') || messageLower.includes('хлеб')) {
    // Пытаемся найти примеры товаров
    let productExamples = '';
    try {
      const productsCollection = await getCollection<Product>('products');
      const products = await productsCollection
        .find({ 
          categoryId: '1',
          subcategoryId: { $regex: /hlebopekarnoe|хлебопекарн/i }
        })
        .limit(3)
        .toArray();
      
      if (products.length > 0) {
        productExamples = '\n\nНапример, у нас есть:\n' + products.map(p => `• ${p.name}`).join('\n');
      }
    } catch (e) {
      // Игнорируем ошибки при поиске товаров
    }
    
    response = `Для пекарни у нас большой выбор хлебопекарного оборудования!${productExamples}\n\nВ каталоге вы найдете:\n• Печи для хлеба (ротационные, конвекционные, каменные)\n• Тестомесы и миксеры для теста\n• Расстоечные шкафы\n• Формы для выпечки\n• Делители и округлители теста\n\nПосмотрите все товары в каталоге: /catalog?categoryId=1&subcategories=1-4`;
  } else if (messageLower.includes('кондитер') || messageLower.includes('торт')) {
    response = 'Для кондитерской у нас есть раздел "Кондитерское оборудование" в категории "Профоборудование". Там вы найдете:\n\n• Кондитерские печи\n• Миксеры и тестомесы\n• Оборудование для работы с шоколадом\n• Формы для выпечки\n• И другое кондитерское оборудование\n\nПерейдите в каталог: /catalog?categoryId=1&subcategories=1-5';
  } else if (messageLower.includes('цен') || messageLower.includes('стоимост') || messageLower.includes('прайс')) {
    response = 'Цены на оборудование уточняйте у наших менеджеров. Они индивидуальны и зависят от многих факторов. Вы можете добавить интересующие товары в корзину и оформить запрос - мы свяжемся с вами и предоставим актуальное коммерческое предложение.';
  } else if (messageLower.includes('доставк')) {
    response = 'Мы осуществляем доставку по всей России. Сроки и стоимость доставки рассчитываются индивидуально в зависимости от региона и объема заказа. Для уточнения деталей свяжитесь с нашими менеджерами через WhatsApp.';
  } else if (messageLower.includes('гарант')) {
    response = 'На все оборудование предоставляется гарантия производителя. Срок гарантии зависит от конкретной модели и производителя. Также мы предлагаем сервисное обслуживание и консультации по эксплуатации. Подробности уточняйте у менеджера.';
  } else {
    // Анализируем, что клиент мог иметь в виду
    const queryWords = messageLower.split(/\s+/).filter(w => w.length > 2);
    const hasKeywords = queryWords.length > 0;
    
    if (hasKeywords) {
      response = `К сожалению, по запросу "${message}" я не нашел точных совпадений в каталоге.\n\n`;
      response += `Попробуйте:\n`;
      response += `• Уточнить название товара или тип оборудования\n`;
      response += `• Посмотреть каталог: /catalog\n`;
      response += `• Связаться с нашими менеджерами через WhatsApp - они помогут подобрать нужное оборудование\n\n`;
      response += `Я могу помочь вам найти:\n`;
      response += `• Холодильное оборудование\n`;
      response += `• Тепловое оборудование (печи, плиты)\n`;
      response += `• Кофейное оборудование\n`;
      response += `• Оборудование для баров\n`;
      response += `• Хлебопекарное и кондитерское оборудование\n`;
      response += `• И многое другое\n\n`;
      response += `Что именно вас интересует?`;
    } else {
      response = 'Здравствуйте! Я консультант интернет-магазина ProfiTech. Чем могу помочь?\n\n';
      response += 'Я могу помочь вам:\n';
      response += '• Подобрать оборудование по характеристикам\n';
      response += '• Найти товары в каталоге\n';
      response += '• Ответить на вопросы о категориях и товарах\n';
      response += '• Помочь с выбором производителя\n';
      response += '• Ответить на вопросы о доставке, гарантии и ценах\n\n';
      response += 'Расскажите, что вас интересует?';
    }
  }

  return NextResponse.json({ 
    success: true, 
    message: response 
  });
}

/* 
ПРИМЕР ИНТЕГРАЦИИ С OPENAI (раскомментируйте при наличии API ключа):

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, products } = await request.json();

    const systemPrompt = `Ты - AI помощник интернет-магазина ProfiTech, специализирующегося на профессиональном оборудовании.
    
Категории товаров:
1. Профоборудование (тепловое, холодильное, электромеханическое и др.)
2. Кофеварки и кофемашины
3. Промышленная мебель
4. Климатическая техника
5. Телекоммуникационное оборудование
6. Точки продаж

Твоя задача:
- Помогать клиентам с выбором оборудования
- Отвечать на вопросы о характеристиках
- Рекомендовать товары
- Быть вежливым и профессиональным

Важно: цены не указываются на сайте, их нужно уточнять у менеджеров.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0].message.content;

    return NextResponse.json({ 
      success: true, 
      message: response 
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json(
      { success: false, error: 'Произошла ошибка при обработке запроса' },
      { status: 500 }
    );
  }
}
*/

