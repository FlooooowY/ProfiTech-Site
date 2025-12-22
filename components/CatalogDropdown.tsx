'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon: string;
  subcategories?: Array<{
    id: string;
    name: string;
    count?: number;
  }>;
}

interface CatalogDropdownProps {
  categories: Category[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export default function CatalogDropdown({ categories, isOpen, onToggle, onClose }: CatalogDropdownProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const currentCategory = categories.find(cat => cat.id === hoveredCategory);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Catalog Button */}
      <button
        onClick={onToggle}
        className={`flex items-center space-x-1 md:space-x-2 px-3 md:px-4 xl:px-6 py-2 md:py-2.5 xl:py-3 rounded-lg font-semibold transition-all text-xs md:text-sm xl:text-base ${
          isOpen
            ? 'bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white shadow-lg'
            : 'bg-white text-gray-900 hover:bg-gray-50 border-2 border-gray-200'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span>Каталог</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 w-[calc(100vw-2rem)] sm:w-[90vw] max-w-[900px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50"
          >
            <div className="flex">
              {/* Categories List */}
              <div className="w-72 bg-gray-50 border-r border-gray-200">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">КАТЕГОРИИ</h3>
                  <div className="space-y-1">
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/catalog?category=${category.id}`}
                        onMouseEnter={() => setHoveredCategory(category.id)}
                        onClick={onClose}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group ${
                          hoveredCategory === category.id
                            ? 'bg-white shadow-sm'
                            : 'hover:bg-white/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{category.icon}</span>
                          <span className="text-sm font-medium text-gray-900 group-hover:text-[#FF6B35]">
                            {category.name}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#FF6B35]" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Subcategories Panel */}
              <div className="flex-1 p-6">
                {currentCategory && currentCategory.subcategories ? (
                  <div>
                    <h3 className="text-lg font-bold mb-4 text-gray-800">
                      {currentCategory.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {currentCategory.subcategories.map((sub) => (
                        <Link
                          key={sub.id}
                          href={`/catalog?category=${currentCategory.id}&subcategory=${sub.id}`}
                          onClick={onClose}
                          className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-orange-50 transition-colors group"
                        >
                          <span className="text-sm text-gray-900 group-hover:text-[#FF6B35] font-medium">
                            {sub.name}
                          </span>
                          {sub.count && (
                            <span className="text-xs text-gray-600 group-hover:text-[#FF6B35]">
                              {sub.count}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-600">
                    <div className="text-center">
                      <span className="text-5xl mb-2 block">📦</span>
                      <p>Наведите на категорию</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

