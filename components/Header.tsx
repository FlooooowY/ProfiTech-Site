'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Menu, X, Search, Phone } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useCatalogStore } from '@/store/catalogStore';
import { COMPANY_INFO } from '@/constants/categories';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  const setSearchQueryStore = useCatalogStore((state) => state.setSearchQuery);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQueryStore(searchQuery);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white shadow-lg'
          : 'bg-white/90 backdrop-blur-sm'
      }`}
      style={{ paddingLeft: '32px', paddingRight: '32px' }}
    >
      <div className="container mx-auto px-2 sm:px-4 max-w-full overflow-x-hidden">
        <div className="flex items-center justify-between h-16 md:h-20 gap-1 sm:gap-2 md:gap-4 flex-wrap">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform">
              <span className="text-white font-bold text-xl">PT</span>
            </div>
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold gradient-text">
                {COMPANY_INFO.name}
              </h1>
              <p className="text-xs text-gray-800">{COMPANY_INFO.slogan}</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8 2xl:gap-10">
            <Link
              href="/"
              className="text-gray-900 hover:text-[#FF6B35] transition-colors font-medium px-4"
            >
              Главная
            </Link>
            <Link
              href="/catalog"
              className="text-gray-900 hover:text-[#FF6B35] transition-colors font-medium px-4"
            >
              Каталог
            </Link>
            <Link
              href="/about"
              className="text-gray-900 hover:text-[#FF6B35] transition-colors font-medium px-4"
            >
              О нас
            </Link>
            <Link
              href="/contacts"
              className="text-gray-900 hover:text-[#FF6B35] transition-colors font-medium px-4"
            >
              Контакты
            </Link>
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex items-center">
            <form
              onSubmit={handleSearch}
              className="flex items-center bg-white border-2 border-gray-200 rounded-full px-3 md:px-4 xl:px-5 py-2 md:py-2.5 w-48 md:w-56 lg:w-64 xl:w-80 max-w-full shadow-md hover:shadow-lg hover:border-[#FF6B35] transition-all"
            >
              <input
                type="text"
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent flex-1 outline-none text-sm font-medium placeholder:text-gray-400"
              />
              <button type="submit" className="ml-2">
                <Search className="w-5 h-5 text-[#FF6B35]" />
              </button>
            </form>
          </div>

          {/* Right Actions */}
          <div className="flex items-center" style={{ gap: '24px' }}>
            <a
              href={`https://wa.me/${COMPANY_INFO.defaultWhatsApp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center space-x-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
              style={{ padding: '12px 24px' }}
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm font-medium">Связаться</span>
            </a>

            <Link
              href="/cart"
              className="relative p-3 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ShoppingCart className="w-6 h-6 text-gray-900" />
              {getTotalItems() > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-[#FF6B35] text-white text-xs font-bold rounded-full flex items-center justify-center"
                >
                  {getTotalItems()}
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
        <form
          onSubmit={handleSearch}
          className="md:hidden pb-4 flex items-center bg-white border-2 border-gray-200 rounded-full px-5 py-3 shadow-md"
        >
          <input
            type="text"
            placeholder="Поиск товаров..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent flex-1 outline-none text-base font-medium placeholder:text-gray-400"
          />
          <button type="submit">
            <Search className="w-6 h-6 text-[#FF6B35]" />
          </button>
        </form>
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
                Главная
              </Link>
              <Link
                href="/catalog"
                onClick={() => setIsMenuOpen(false)}
                className="text-gray-900 hover:text-[#FF6B35] transition-colors font-medium py-2"
              >
                Каталог
              </Link>
              <Link
                href="/about"
                onClick={() => setIsMenuOpen(false)}
                className="text-gray-900 hover:text-[#FF6B35] transition-colors font-medium py-2"
              >
                О нас
              </Link>
              <Link
                href="/contacts"
                onClick={() => setIsMenuOpen(false)}
                className="text-gray-900 hover:text-[#FF6B35] transition-colors font-medium py-2"
              >
                Контакты
              </Link>
              <a
                href={`https://wa.me/${COMPANY_INFO.defaultWhatsApp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                style={{ padding: '16px 32px' }}
              >
                <Phone className="w-4 h-4" />
                <span className="text-sm font-medium">Связаться</span>
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

