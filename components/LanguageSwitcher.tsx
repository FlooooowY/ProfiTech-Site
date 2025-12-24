'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentLang, setCurrentLang] = useState<'ru' | 'en'>('ru');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Определяем текущий язык из localStorage
    const savedLang = (localStorage.getItem('language') as 'ru' | 'en') || 'ru';
    setCurrentLang(savedLang);
  }, []);

  const switchLanguage = (langCode: 'ru' | 'en') => {
    setCurrentLang(langCode);
    localStorage.setItem('language', langCode);
    setIsOpen(false);
    
    // Обновляем URL для SEO (добавляем /en для английского, убираем для русского)
    const currentPath = pathname;
    let newPath = currentPath;
    
    if (langCode === 'en') {
      // Если переключаемся на английский, добавляем /en
      if (!currentPath.startsWith('/en')) {
        newPath = `/en${currentPath === '/' ? '' : currentPath}`;
      }
    } else {
      // Если переключаемся на русский, убираем /en
      if (currentPath.startsWith('/en')) {
        newPath = currentPath.replace('/en', '') || '/';
      }
    }
    
    // Обновляем страницу для применения языка
    if (newPath !== currentPath) {
      router.push(newPath);
    } else {
      window.location.reload();
    }
  };

  const currentLanguage = languages.find(lang => lang.code === currentLang) || languages[0];

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
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => switchLanguage(lang.code as 'ru' | 'en')}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  currentLang === lang.code ? 'bg-gray-50' : ''
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="flex-1 font-medium text-gray-900">{lang.name}</span>
                {currentLang === lang.code && (
                  <span className="text-[#FF6B35] font-bold">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

