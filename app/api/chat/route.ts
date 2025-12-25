import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { Product } from '@/types';

// Интеграция с OpenRouter API для использования модели MiMo-V2-Flash от Xiaomi
// Для работы нужно добавить OPENROUTER_API_KEY в .env.local
// Получить ключ можно на https://openrouter.ai/

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'xiaomi/mimo-v2-flash'; // Бесплатная модель от Xiaomi

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
              values.add(value);
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
  ];
  
  // Проверяем паттерны
  for (const pattern of patterns) {
    const match = queryLower.match(pattern);
    if (match) {
      const word1 = match[1]?.toLowerCase() || '';
      const word2 = match[2]?.toLowerCase() || '';
      
      // Проверяем, является ли одно из слов характеристикой
      for (const [charName, keywords] of Object.entries(characteristicMap)) {
        if (keywords.some(keyword => word1.includes(keyword) || word2.includes(keyword))) {
          // Определяем тип товара (если есть)
          let productType: string | undefined;
          if (word1 !== charName && !keywords.includes(word1)) {
            productType = word1;
          } else if (word2 && word2 !== charName && !keywords.includes(word2)) {
            productType = word2;
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
        const productKeywords = ['холодильник', 'морозилк', 'печь', 'кофемашин', 'кофеварк', 'бар', 'мебель'];
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
        // Ищем товары по типу
        const typeKeywords = charQuery.productType.split(/\s+/).filter(w => w.length > 2);
        const searchConditions: any[] = typeKeywords.map(keyword => ({
          $or: [
            { name: { $regex: new RegExp(keyword, 'i') } },
            { description: { $regex: new RegExp(keyword, 'i') } },
            { subcategoryId: { $regex: new RegExp(keyword, 'i') } }
          ]
        }));
        
        productsToAnalyze = await productsCollection
          .find({ $or: searchConditions })
          .limit(100)
          .toArray();
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
                       'найти', 'найти', 'купить', 'стоимость', 'цена', 'сколько', 'есть', 'у вас'];
    
    const keywords = queryLower
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    if (keywords.length === 0) {
      return { products: [] };
    }

    // Создаем поисковый запрос
    const searchConditions: any[] = [];
    
    // Поиск по названию
    searchConditions.push({
      name: { $regex: new RegExp(keywords.join('|'), 'i') }
    });
    
    // Поиск по описанию
    searchConditions.push({
      description: { $regex: new RegExp(keywords.join('|'), 'i') }
    });
    
    // Поиск по производителю
    searchConditions.push({
      manufacturer: { $regex: new RegExp(keywords.join('|'), 'i') }
    });
    
    // Поиск по характеристикам
    keywords.forEach(keyword => {
      searchConditions.push({
        'characteristics.name': { $regex: new RegExp(keyword, 'i') }
      });
      searchConditions.push({
        'characteristics.value': { $regex: new RegExp(keyword, 'i') }
      });
    });

    // Ищем товары
    const foundProducts = await productsCollection
      .find({ $or: searchConditions })
      .limit(10)
      .toArray();

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

    // Проверяем наличие API ключа
    const apiKey = process.env.OPENROUTER_API_KEY;
    
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
    
    if (!apiKey) {
      console.warn('OPENROUTER_API_KEY не установлен, используется fallback логика');
      // Fallback на простую логику, если API ключ не установлен
      return await getFallbackResponse(message, conversationHistory, foundProducts, suggestedLink);
    }

    // Формируем системный промпт с контекстом
    let systemPrompt = `Ты - дружелюбный и знающий консультант интернет-магазина ProfiTech, который помогает клиентам выбрать профессиональное оборудование.

Категории товаров:
1. Профоборудование:
   - Хлебопекарное: печи для хлеба (ротационные, конвекционные, каменные), тестомесы, расстоечные шкафы, формы для выпечки
   - Кондитерское: кондитерские печи, миксеры, тестомесы, оборудование для работы с шоколадом
   - Холодильное: холодильники, морозильники, витрины, шоковые морозильники
   - Тепловое: печи, плиты, грили, фритюрницы
   - Для баров: льдогенераторы, блендеры, шейкеры, барные холодильники
   - И другие типы оборудования

2. Кофеварки и кофемашины: автоматические кофемашины, эспрессо-машины, кофемолки, аксессуары
3. Промышленная мебель: для кухни, зала, бара, офиса
4. Климатическая техника: вентиляция, кондиционеры, обогреватели
5. Телекоммуникационное оборудование
6. Точки продаж (POS-системы)
7. Бытовая техника

Твоя задача:
- Отвечай естественно и дружелюбно, как живой консультант
- Будь конкретным: используй реальные данные о товарах из каталога
- Отвечай на основе запроса клиента, а не стандартными фразами
- Если в каталоге есть подходящие товары - обязательно упомяни их названия
- Предлагай перейти в каталог для просмотра товаров
- НЕ используй общие фразы типа "расскажите подробнее" или "что именно вас интересует"
- НЕ повторяй один и тот же ответ на разные вопросы
- Анализируй запрос клиента и давай релевантный ответ

Важно:
- Цены уточняются у менеджеров через WhatsApp
- Всегда давай ссылку на каталог в конце ответа, если она есть`;

    // Добавляем контекст о найденных товарах
    if (foundProducts.length > 0) {
      systemPrompt += `\n\nВАЖНО: В нашем каталоге найдены следующие товары по запросу клиента:\n`;
      foundProducts.slice(0, 5).forEach((product, index) => {
        systemPrompt += `${index + 1}. ${product.name}`;
        if (product.manufacturer && product.manufacturer !== 'Не указан') {
          systemPrompt += ` (Производитель: ${product.manufacturer})`;
        }
        if (product.characteristics && product.characteristics.length > 0) {
          const mainChars = product.characteristics.slice(0, 2).map(c => `${c.name}: ${c.value}`).join(', ');
          if (mainChars) {
            systemPrompt += ` - ${mainChars}`;
          }
        }
        systemPrompt += '\n';
      });
      systemPrompt += `\nИспользуй эти конкретные товары в своем ответе. Назови их названия, чтобы показать, что у нас действительно есть то, что ищет клиент.`;
      
      if (suggestedLink) {
        systemPrompt += `\n\nОбязательно предложи перейти в каталог: ${suggestedLink}`;
      }
    } else if (suggestedCategory) {
      systemPrompt += `\n\nВАЖНО: Пользователь спрашивает про "${suggestedCategory}".`;
      systemPrompt += `\n\nХотя конкретные товары не найдены, предложи клиенту посмотреть категорию в каталоге.`;
      
      if (suggestedLink) {
        systemPrompt += `\n\nОбязательно предложи перейти в каталог: ${suggestedLink}`;
      }
    }
    
    systemPrompt += `\n\nОтвечай конкретно и по делу на основе запроса клиента. НЕ используй общие фразы.`;

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
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API Error:', response.status, errorData);
      
      // Fallback на простую логику при ошибке API
      return await getFallbackResponse(message, conversationHistory, foundProducts, suggestedLink);
    }

    const data = await response.json();
    
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
    const productList = foundProducts.slice(0, 5).map((p, index) => {
      let productInfo = `${index + 1}. ${p.name}`;
      if (p.manufacturer && p.manufacturer !== 'Не указан') {
        productInfo += ` (${p.manufacturer})`;
      }
      if (p.characteristics && p.characteristics.length > 0) {
        const mainChar = p.characteristics[0];
        if (mainChar) {
          productInfo += ` - ${mainChar.name}: ${mainChar.value}`;
        }
      }
      return productInfo;
    }).join('\n');
    
    response = `Отлично! Я нашел для вас подходящие товары по вашему запросу:\n\n${productList}`;
    
    if (foundProducts.length > 5) {
      response += `\n\nИ еще ${foundProducts.length - 5} товар(ов) в каталоге.`;
    }
    
    if (suggestedLink) {
      response += `\n\n📦 Посмотреть все товары в каталоге: ${suggestedLink}`;
    } else {
      response += `\n\n📦 Посмотреть все товары в каталоге: /catalog`;
    }
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
    response = 'Спасибо за ваш вопрос! Я могу помочь вам:\n\n• Подобрать оборудование по характеристикам\n• Найти товары в каталоге\n• Ответить на вопросы о категориях\n• Помочь с выбором производителя\n\nРасскажите подробнее, что именно вас интересует?';
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

