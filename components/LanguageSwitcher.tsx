'use client';

import { useState } from 'react';
import { Link, usePathname } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const locale = useLocale() as 'ru' | 'en';
  const [isOpen, setIsOpen] = useState(false);

  // Функция для получения пути с нужной локалью
  const getLocalizedPath = (targetLocale: 'ru' | 'en') => {
    // Убираем текущий префикс локали если есть
    let path = pathname;
    if (path.startsWith('/ru')) {
      path = path.replace('/ru', '') || '/';
    } else if (path.startsWith('/en')) {
      path = path.replace('/en', '') || '/';
    }
    
    // Добавляем префикс для английского, для русского оставляем без префикса
    if (targetLocale === 'en') {
      return `/en${path === '/' ? '' : path}`;
    } else {
      return path;
    }
  };

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 bg-white"
        title={currentLanguage.name}
        aria-label="Переключить язык"
      >
        <Globe className="w-5 h-5 text-gray-700" />
        <span className="text-sm font-medium text-gray-700">
          {currentLanguage.code.toUpperCase()}
        </span>
        <span className="hidden md:inline text-sm font-medium text-gray-700 ml-1">
          {currentLanguage.name}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
            {languages.map((lang) => {
              const isActive = locale === lang.code;
              const localizedPath = getLocalizedPath(lang.code as 'ru' | 'en');
              
              return (
                <Link
                  key={lang.code}
                  href={localizedPath}
                  onClick={() => setIsOpen(false)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    isActive ? 'bg-gray-50' : ''
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="flex-1 font-medium text-gray-900">{lang.name}</span>
                  {isActive && (
                    <span className="text-[#FF6B35] font-bold">✓</span>
                  )}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

