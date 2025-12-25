'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Globe, ChevronDown } from 'lucide-react';
import { getCurrentLocale, setLocale as setLocaleStorage } from '@/lib/i18n';

const languages = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState<'ru' | 'en'>('ru');
  const [mounted, setMounted] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Загружаем текущую локаль при монтировании
  useEffect(() => {
    setMounted(true);
    const locale = getCurrentLocale();
    setCurrentLocale(locale);
  }, []);

  // Обновляем позицию выпадающего списка
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonRect(rect);
    }
  }, [isOpen]);

  // Закрываем dropdown при клике вне его или при скролле
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const handleLanguageChange = (newLocale: 'ru' | 'en') => {
    if (newLocale === currentLocale) {
      setIsOpen(false);
      return;
    }

    // Сохраняем локаль в localStorage
    setLocaleStorage(newLocale);
    setCurrentLocale(newLocale);
    setIsOpen(false);
    
    // Триггерим событие для обновления всех компонентов
    window.dispatchEvent(new Event('languagechange'));
    
    // Небольшая задержка для обновления компонентов, затем перезагрузка для полного обновления
    setTimeout(() => {
      window.location.reload();
    }, 50);
  };

  const currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0];

  // Вычисляем позицию для портала
  const dropdownStyle = buttonRect ? {
    position: 'fixed' as const,
    top: `${buttonRect.bottom + 8}px`,
    right: `${window.innerWidth - buttonRect.right}px`,
    zIndex: 9999,
  } : {};

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white border-2 border-gray-200 hover:border-[#FF6B35] transition-all duration-200 shadow-sm hover:shadow-md group"
          title={currentLanguage.name}
          aria-label="Переключить язык"
          aria-expanded={isOpen}
        >
          <span className="text-lg flex-shrink-0">{currentLanguage.flag}</span>
          <span className="text-sm font-semibold text-gray-800 group-hover:text-[#FF6B35] transition-colors hidden sm:inline">
            {currentLanguage.code.toUpperCase()}
          </span>
          <ChevronDown 
            className={`w-4 h-4 text-gray-600 transition-transform duration-200 flex-shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>
      </div>

      {mounted && isOpen && buttonRect && createPortal(
        <>
          {/* Overlay для закрытия */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          {/* Выпадающий список */}
          <div
            ref={dropdownRef}
            className="fixed w-56 bg-white rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden z-[9999]"
            style={dropdownStyle}
          >
            {languages.map((lang) => {
              const isActive = currentLocale === lang.code;
              
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code as 'ru' | 'en')}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gradient-to-r transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#FF6B35]/10 to-[#F7931E]/10 border-l-4 border-[#FF6B35]' 
                      : 'hover:from-gray-50 hover:to-orange-50/30'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">{lang.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${isActive ? 'text-[#FF6B35]' : 'text-gray-900'}`}>
                      {lang.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {lang.code.toUpperCase()}
                    </div>
                  </div>
                  {isActive && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#F7931E] flex items-center justify-center">
                        <span className="text-white font-bold text-xs">✓</span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </>
  );
}

