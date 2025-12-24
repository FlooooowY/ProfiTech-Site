'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Menu, X, Search, Phone, Heart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useCatalogStore } from '@/store/catalogStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { COMPANY_INFO } from '@/constants/categories';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslations } from '@/lib/i18n';

export default function Header() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  const setSearchQueryStore = useCatalogStore((state) => state.setSearchQuery);
  const favorites = useFavoritesStore((state) => state.favorites);
  const t = useTranslations();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchQueryStore(searchQuery.trim());
      router.push('/catalog');
    }
  };

  // Горячий поиск с debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        setSearchQueryStore(searchQuery.trim());
        // Если мы на странице каталога, обновляем результаты
        if (window.location.pathname === '/catalog') {
          // Триггерим обновление через событие
          window.dispatchEvent(new CustomEvent('searchUpdated'));
        } else {
          // Если не на каталоге, переходим туда
          router.push('/catalog');
        }
      } else {
        // Если поиск пустой, очищаем
        setSearchQueryStore('');
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [searchQuery, setSearchQueryStore, router]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white shadow-lg'
          : 'bg-white/90 backdrop-blur-sm'
      }`}
      style={{ paddingLeft: '16px', paddingRight: '16px' }}
    >
      <div className="container mx-auto px-2 sm:px-4 max-w-full overflow-x-hidden">
        <div className="flex items-center justify-between h-16 md:h-20 gap-1 sm:gap-2 md:gap-4 flex-wrap">
          {/* Logo */}
          <Link href="/" className="flex items-center group" style={{ gap: '12px' }}>
            <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform flex-shrink-0">
              <span className="text-white font-bold text-xl">PT</span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold gradient-text truncate">
                {COMPANY_INFO.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-800 truncate hidden sm:block">{COMPANY_INFO.slogan}</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8 2xl:gap-10">
            <Link
              href="/"
              className="text-gray-900 hover:text-[#FF6B35] transition-colors font-medium px-4"
            >
              {t('common.home')}
            </Link>
            <Link
              href="/catalog"
              className="text-gray-900 hover:text-[#FF6B35] transition-colors font-medium px-4"
            >
              {t('common.catalog')}
            </Link>
            <Link
              href="/about"
              className="text-gray-900 hover:text-[#FF6B35] transition-colors font-medium px-4"
            >
              {t('common.about')}
            </Link>
            <Link
              href="/contacts"
              className="text-gray-900 hover:text-[#FF6B35] transition-colors font-medium px-4"
            >
              {t('common.contacts')}
            </Link>
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex items-center">
            <div className="flex items-center bg-white border-2 border-gray-200 rounded-full px-3 md:px-4 xl:px-5 py-2 md:py-2.5 w-48 md:w-56 lg:w-64 xl:w-80 max-w-full shadow-md hover:shadow-lg hover:border-[#FF6B35] transition-all focus-within:border-[#FF6B35]">
              <input
                type="text"
                placeholder={t('common.search') + '..."'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent flex-1 outline-none text-sm font-medium placeholder:text-gray-400"
              />
              <Search className="w-5 h-5 text-[#FF6B35] flex-shrink-0" />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center" style={{ gap: '12px', marginRight: '16px' }}>
            <LanguageSwitcher />
            
            <a
              href={`https://wa.me/${COMPANY_INFO.defaultWhatsApp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center space-x-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
              style={{ padding: '12px 24px' }}
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm font-medium">{t('home.writeWhatsApp')}</span>
            </a>

            <Link
              href="/favorites"
              className="relative p-3 hover:bg-gray-100 rounded-full transition-colors"
              title={t('common.favorites')}
            >
              <Heart className="w-6 h-6 text-gray-900" />
              {favorites.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                >
                  {favorites.length}
                </motion.span>
              )}
            </Link>

            <Link
              href="/cart"
              className="relative p-3 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ShoppingCart className="w-6 h-6 text-gray-900" />
              {getTotalItems() > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#FF6B35] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 border-2 border-white shadow-sm"
                >
                  {getTotalItems() > 99 ? '99+' : getTotalItems()}
                </motion.span>
              )}
            </Link>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-3 hover:bg-gray-100 rounded-full transition-colors"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-gray-900" />
              ) : (
                <Menu className="w-6 h-6 text-gray-900" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4 flex items-center bg-white border-2 border-gray-200 rounded-full px-5 py-3 shadow-md focus-within:border-[#FF6B35]">
          <input
            type="text"
            placeholder={t('common.search') + '..."'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent flex-1 outline-none text-base font-medium placeholder:text-gray-400"
          />
          <Search className="w-6 h-6 text-[#FF6B35] flex-shrink-0" />
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t"
          >
            <nav className="container mx-auto px-4 py-6 flex flex-col space-y-4">
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className="text-gray-900 hover:text-[#FF6B35] transition-colors font-medium py-2"
              >
                {t('common.home')}
              </Link>
              <Link
                href="/catalog"
                onClick={() => setIsMenuOpen(false)}
                className="text-gray-900 hover:text-[#FF6B35] transition-colors font-medium py-2"
              >
                {t('common.catalog')}
              </Link>
              <Link
                href="/about"
                onClick={() => setIsMenuOpen(false)}
                className="text-gray-900 hover:text-[#FF6B35] transition-colors font-medium py-2"
              >
                {t('common.about')}
              </Link>
              <Link
                href="/contacts"
                onClick={() => setIsMenuOpen(false)}
                className="text-gray-900 hover:text-[#FF6B35] transition-colors font-medium py-2"
              >
                {t('common.contacts')}
              </Link>
              <Link
                href="/favorites"
                onClick={() => setIsMenuOpen(false)}
                className="text-gray-900 hover:text-[#FF6B35] transition-colors font-medium py-2 flex items-center space-x-2"
              >
                <Heart className="w-5 h-5" />
                <span>{t('common.favorites')} {favorites.length > 0 && `(${favorites.length})`}</span>
              </Link>
              <div className="flex items-center justify-between">
                <LanguageSwitcher />
              </div>
              <a
                href={`https://wa.me/${COMPANY_INFO.defaultWhatsApp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                style={{ padding: '16px 32px' }}
              >
                <Phone className="w-4 h-4" />
                <span className="text-sm font-medium">{t('home.writeWhatsApp')}</span>
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

