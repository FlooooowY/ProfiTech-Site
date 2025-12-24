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
  const [currentLang, setCurrentLang] = useState('ru');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Определяем текущий язык из localStorage или из URL
    const savedLang = localStorage.getItem('language') || 'ru';
    setCurrentLang(savedLang);
  }, []);

  const switchLanguage = (langCode: string) => {
    setCurrentLang(langCode);
    localStorage.setItem('language', langCode);
    setIsOpen(false);
    
    // Обновляем страницу для применения языка
    window.location.reload();
  };

  const currentLanguage = languages.find(lang => lang.code === currentLang) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        title={currentLanguage.name}
      >
        <Globe className="w-5 h-5 text-gray-700" />
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="hidden md:inline text-sm font-medium text-gray-700">
          {currentLanguage.code.toUpperCase()}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => switchLanguage(lang.code)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  currentLang === lang.code ? 'bg-gray-50' : ''
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="flex-1 font-medium text-gray-900">{lang.name}</span>
                {currentLang === lang.code && (
                  <span className="text-[#FF6B35]">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

