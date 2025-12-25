'use client';

// Простая система переводов без полной реструктуризации приложения

import { useState, useEffect } from 'react';
import ru from '@/messages/ru.json';
import en from '@/messages/en.json';

export type Locale = 'ru' | 'en';

const translations = {
  ru,
  en,
};

export function getTranslations(locale: Locale = 'ru') {
  const lang = locale === 'en' ? 'en' : 'ru';
  return translations[lang];
}

export function getCurrentLocale(): Locale {
  if (typeof window === 'undefined') return 'ru';
  return (localStorage.getItem('language') as Locale) || 'ru';
}

export function setLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('language', locale);
  // Триггерим событие для обновления компонентов
  window.dispatchEvent(new Event('languagechange'));
}

// Хук для использования переводов в компонентах
export function useTranslations(namespace?: string) {
  const [locale, setLocale] = useState<Locale>(() => {
    // Инициализируем локаль сразу при создании компонента
    if (typeof window !== 'undefined') {
      return getCurrentLocale();
    }
    return 'ru';
  });

  useEffect(() => {
    // Обновляем локаль при монтировании
    const updateLocale = () => {
      const newLocale = getCurrentLocale();
      setLocale(newLocale);
    };
    
    updateLocale();
    
    // Слушаем изменения языка через storage и custom event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'language') {
        updateLocale();
      }
    };
    
    const handleLanguageChange = () => {
      updateLocale();
    };
    
    // Также проверяем периодически (на случай, если localStorage изменился в другой вкладке)
    const interval = setInterval(() => {
      const currentLocale = getCurrentLocale();
      if (currentLocale !== locale) {
        updateLocale();
      }
    }, 200);
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('languagechange', handleLanguageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('languagechange', handleLanguageChange);
    };
  }, [locale]);

  const t = getTranslations(locale);

  return (key: string): string => {
    const keys = key.split('.');
    let value: any = namespace ? t[namespace as keyof typeof t] : t;
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };
}

