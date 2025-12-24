import { useTranslations } from './i18n';

// Функция для получения переведенного названия категории
export function getCategoryName(categorySlug: string, locale: 'ru' | 'en' = 'ru'): string {
  const categoryMap: { [key: string]: { ru: string; en: string } } = {
    'profoborudovanie': { ru: 'Профоборудование', en: 'Professional Equipment' },
    'kofevarki-i-kofemashiny': { ru: 'Кофеварки и кофемашины', en: 'Coffee Machines' },
    'mebel': { ru: 'Мебель', en: 'Furniture' },
    'ventilyatsionnoe-oborudovanie': { ru: 'Вентиляционное оборудование', en: 'Ventilation Equipment' },
  };

  return categoryMap[categorySlug]?.[locale] || categoryMap[categorySlug]?.ru || categorySlug;
}

// Хук для использования в компонентах
export function useCategoryTranslation() {
  const t = useTranslations();
  const locale = (typeof window !== 'undefined' ? (localStorage.getItem('language') as 'ru' | 'en') || 'ru' : 'ru') as 'ru' | 'en';
  
  return (categorySlug: string) => {
    return getCategoryName(categorySlug, locale);
  };
}

