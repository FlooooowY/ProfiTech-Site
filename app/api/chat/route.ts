import { NextRequest, NextResponse } from 'next/server';

// Интеграция с OpenRouter API для использования модели MiMo-V2-Flash от Xiaomi
// Для работы нужно добавить OPENROUTER_API_KEY в .env.local
// Получить ключ можно на https://openrouter.ai/

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'xiaomi/mimo-v2-flash'; // Бесплатная модель от Xiaomi

export async function POST(request: NextRequest) {
  try {
    const { message, messages: conversationHistory = [] } = await request.json();

    // Проверяем наличие API ключа
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      console.warn('OPENROUTER_API_KEY не установлен, используется fallback логика');
      // Fallback на простую логику, если API ключ не установлен
      return getFallbackResponse(message);
    }

    // Формируем системный промпт
    const systemPrompt = `Ты - AI помощник интернет-магазина ProfiTech, специализирующегося на профессиональном оборудовании.

Категории товаров:
1. Профоборудование (тепловое, холодильное, электромеханическое, хлебопекарное, кондитерское, для баров, мясоперерабатывающее, оборудование фаст-фуд, нейтральное, фасовочно-упаковочное, прачечное, весовое, посудомоечное, линии раздачи, оборудование для кейтеринга)
2. Кофеварки и кофемашины (чайники для кофе, кофемашины, кофе-принтеры, кофеварки, сиропные станции, кофемолки, холодильники для молока, вспениватели и дозаторы молока, подогреватели чашек, средства для очистки, кофе, джезвы, аксессуары)
3. Промышленная мебель (мебель для кухни, мебель для зала, мебель для бара, мебель для офиса)
4. Климатическая техника (вентиляционное оборудование, кондиционеры, обогреватели)
5. Телекоммуникационное оборудование (телефония, видеонаблюдение)
6. Точки продаж (POS-системы)
7. Бытовая техника

Твоя задача:
- Помогать клиентам с выбором оборудования
- Отвечать на вопросы о характеристиках товаров
- Рекомендовать товары из каталога
- Быть вежливым, профессиональным и дружелюбным
- Отвечать кратко и по делу

Важно:
- Цены не указываются на сайте, их нужно уточнять у менеджеров через WhatsApp
- Всегда предлагай связаться с менеджером для уточнения деталей
- Если не знаешь ответа, честно скажи об этом и предложи связаться с менеджером`;

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
      return getFallbackResponse(message);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const aiResponse = data.choices[0].message.content;
      
      return NextResponse.json({ 
        success: true, 
        message: aiResponse 
      });
    } else {
      console.error('Unexpected response format:', data);
      return getFallbackResponse(message);
    }

  } catch (error) {
    console.error('AI Chat Error:', error);
    // Fallback на простую логику при любой ошибке
    const { message } = await request.json();
    return getFallbackResponse(message);
  }
}

// Fallback функция с простой логикой (используется если API недоступен)
function getFallbackResponse(message: string) {
  const messageLower = message.toLowerCase();
  let response = '';
  
  if (messageLower.includes('кофе') || messageLower.includes('кофемашин')) {
    response = 'Отличный выбор! У нас широкий ассортимент кофейного оборудования. Рекомендую обратить внимание на раздел "Кофеварки и кофемашины". Там вы найдете профессиональные кофемашины, кофемолки и все необходимые аксессуары. Что именно вас интересует: автоматические кофемашины, профессиональные эспрессо-машины или может быть кофемолки?';
  } else if (messageLower.includes('холодильн')) {
    response = 'Для холодильного оборудования у нас есть специальный раздел в категории "Профоборудование". Мы предлагаем промышленные холодильники различных объемов и конфигураций. Расскажите подробнее о ваших потребностях: какой объем нужен, для каких целей используете?';
  } else if (messageLower.includes('бар')) {
    response = 'Для оснащения бара у нас есть специализированный раздел "Оборудование для баров" в категории профоборудования. Там вы найдете льдогенераторы, блендеры, барные холодильники и многое другое. Также рекомендую посмотреть кофейное оборудование. Какие конкретно позиции вас интересуют?';
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

