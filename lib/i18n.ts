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

// Хук для использования переводов в компонентах
export function useTranslations(namespace?: string) {
  const [locale, setLocale] = useState<Locale>('ru');

  useEffect(() => {
    setLocale(getCurrentLocale());
    
    // Слушаем изменения языка
    const handleStorageChange = () => {
      setLocale(getCurrentLocale());
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Также проверяем при каждом рендере
    const interval = setInterval(() => {
      const newLocale = getCurrentLocale();
      if (newLocale !== locale) {
        setLocale(newLocale);
      }
    }, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
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

