/**
 * Маппинг категорий из CSV на ID из constants/categories.ts
 */

export const CATEGORY_MAPPING: Record<string, string> = {
  // Из CSV -> В константы
  'профоборудование': '1',
  'profoborudovanie': '1',
  
  'кофеварки-и-кофемашины': '2',
  'kofevarki-i-kofemashiny': '2',
  
  'промышленная-мебель': '3',
  'promyshlennaya-mebel': '3',
  
  'климатическая-техника': '4',
  'klimaticheskaya-tehnika': '4',
  
  'бытовая-техника': '7',
  'bitovaya-tehnika': '7',
  
  'телекоммуникационное-оборудование': '5',
  'telekomunicionoe-oborudovanie': '5',
  
  'точки-продаж': '6',
  'tochki-prodazh': '6',
};

/**
 * Преобразует categoryId из CSV в ID из константtorок
 */
export function normalizeCategoryId(csvCategoryId: string): string {
  const normalized = csvCategoryId.toLowerCase().trim();
  return CATEGORY_MAPPING[normalized] || csvCategoryId;
}

