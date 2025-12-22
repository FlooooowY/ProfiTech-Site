'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Filter, X, ChevronDown, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { useCatalogStore } from '@/store/catalogStore';
import { CATEGORIES } from '@/constants/categories';
import { Product } from '@/types';

const PRODUCTS_PER_PAGE = 24;

export default function CatalogPage() {
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);
  const [selectedCharacteristics, setSelectedCharacteristics] = useState<{ [key: string]: string[] }>({});
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { filteredProducts, products, setProducts, setFilter, clearFilters, isLoading, filter } =
    useCatalogStore();
  
  // Отладочное логирование состояния store
  useEffect(() => {
    console.log('Store state - products.length:', products.length, 'filteredProducts.length:', filteredProducts.length, 'isLoading:', isLoading);
  }, [products.length, filteredProducts.length, isLoading]);

  // Загрузка данных при монтировании
  useEffect(() => {
    const loadProducts = async () => {
      try {
        useCatalogStore.setState({ isLoading: true });
        const response = await fetch('/data/products.json', {
          cache: 'no-cache'
        });
        if (response.ok) {
          const data = await response.json();
          console.log('Загружено товаров:', data.length);
          // Фильтруем только валидные товары
          const validProducts = data.filter((p: Product) => p && p.id);
          console.log('Валидных товаров:', validProducts.length);
          setProducts(validProducts);
        } else {
          console.error('Ошибка загрузки: статус', response.status);
          useCatalogStore.setState({ isLoading: false });
        }
      } catch (error) {
        console.error('Ошибка загрузки каталога:', error);
        useCatalogStore.setState({ isLoading: false });
        // Пытаемся загрузить из кэша store, если есть
        const storeProducts = useCatalogStore.getState().products;
        if (storeProducts.length > 0) {
          console.log('Используем товары из store:', storeProducts.length);
        }
      }
    };

    if (products.length === 0) {
      loadProducts();
    } else {
      console.log('Товары уже загружены:', products.length);
    }
  }, [products.length, setProducts]);

  // Применение фильтров из URL
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    const subcategoryFromUrl = searchParams.get('subcategory');
    
    if (categoryFromUrl) {
      setTimeout(() => setSelectedCategory(categoryFromUrl), 0);
    }
    if (subcategoryFromUrl) {
      setTimeout(() => setSelectedSubcategory(subcategoryFromUrl), 0);
    }
  }, [searchParams]);

  // Синхронизация selectedCharacteristics с filter из store
  useEffect(() => {
    if (filter.characteristics && Object.keys(filter.characteristics).length > 0) {
      setSelectedCharacteristics(filter.characteristics);
    }
  }, []);

  // Пагинация - используем filteredProducts если есть активные фильтры, иначе все products
  const hasActiveFilters = selectedCategory || selectedSubcategory || selectedManufacturers.length > 0 || Object.keys(selectedCharacteristics).length > 0;
  const productsToShow = useMemo(() => {
    console.log('productsToShow - products.length:', products.length, 'filteredProducts.length:', filteredProducts.length, 'hasActiveFilters:', hasActiveFilters);
    if (hasActiveFilters && filteredProducts.length > 0) {
      return filteredProducts;
    }
    return products;
  }, [hasActiveFilters, filteredProducts, products]);
  
  const validProducts = useMemo(() => {
    const filtered = productsToShow.filter(p => p && p.id);
    console.log('Валидных товаров для отображения:', filtered.length, 'productsToShow.length:', productsToShow.length, 'Активные фильтры:', hasActiveFilters);
    return filtered;
  }, [productsToShow, hasActiveFilters]);
  
  const totalPages = Math.ceil(validProducts.length / PRODUCTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const currentProducts = validProducts.slice(startIndex, endIndex);
  
  console.log('Текущая страница:', currentPage, 'Товаров на странице:', currentProducts.length, 'Всего страниц:', totalPages);

  // Получение списка уникальных производителей из всех товаров (мемоизировано)
  // Выбранные производители отображаются сверху
  const manufacturers = useMemo(() => {
    if (products.length === 0) return [];
    const allManufacturers = Array.from(
      new Set(products.filter(p => p && p.manufacturer).map((p) => p.manufacturer))
    ).filter(Boolean);
    
    // Разделяем на выбранные и невыбранные
    const selected = allManufacturers.filter(m => selectedManufacturers.includes(m)).sort();
    const unselected = allManufacturers.filter(m => !selectedManufacturers.includes(m)).sort();
    
    // Выбранные сверху, затем невыбранные
    return [...selected, ...unselected];
  }, [products, selectedManufacturers]);

  // Получение уникальных характеристик из отфильтрованных товаров
  const availableCharacteristics = useMemo(() => {
    const charsMap: { [key: string]: Set<string> } = {};
    
    // Используем товары из текущей категории или все товары
    const productsToAnalyze = selectedCategory 
      ? products.filter(p => p.categoryId === selectedCategory)
      : products;
    
    productsToAnalyze.forEach(product => {
      if (product.characteristics && Array.isArray(product.characteristics)) {
        product.characteristics.forEach(char => {
          if (char && char.name && char.value) {
            if (!charsMap[char.name]) {
              charsMap[char.name] = new Set();
            }
            charsMap[char.name].add(char.value);
          }
        });
      }
    });
    
    // Преобразуем в объект с массивами отсортированных значений
    const result: { [key: string]: string[] } = {};
    Object.keys(charsMap).sort().forEach(key => {
      result[key] = Array.from(charsMap[key]).sort();
    });
    
    return result;
  }, [products, selectedCategory]);

  useEffect(() => {
    if (products.length > 0) {
      setFilter({
        categoryId: selectedCategory || undefined,
        subcategoryId: selectedSubcategory || undefined,
        manufacturers: selectedManufacturers,
        characteristics: selectedCharacteristics,
      });
      // Сбрасываем на первую страницу при изменении фильтров
      setCurrentPage(1);
    }
  }, [selectedCategory, selectedSubcategory, selectedManufacturers, selectedCharacteristics, setFilter, products.length]);

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSelectedManufacturers([]);
    setSelectedCharacteristics({});
    setCurrentPage(1);
    clearFilters();
  };

  const toggleCharacteristic = (charName: string, charValue: string) => {
    setSelectedCharacteristics(prev => {
      const current = prev[charName] || [];
      const updated = current.includes(charValue)
        ? current.filter(v => v !== charValue)
        : [...current, charValue];
      
      if (updated.length === 0) {
        const { [charName]: _, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [charName]: updated };
    });
  };

  const toggleManufacturer = (manufacturer: string) => {
    if (!manufacturer) return;
    try {
      setSelectedManufacturers((prev) =>
        prev.includes(manufacturer)
          ? prev.filter((m) => m !== manufacturer)
          : [...prev, manufacturer]
      );
    } catch (error) {
      console.error('Ошибка при переключении производителя:', error);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Прокрутка наверх при смене страницы
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const showPages = 5; // Количество отображаемых кнопок страниц
    
    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
    const endPage = Math.min(totalPages, startPage + showPages - 1);
    
    if (endPage - startPage < showPages - 1) {
      startPage = Math.max(1, endPage - showPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-center space-x-2 mt-12">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-10 h-10 flex items-center justify-center rounded-lg border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border hover:bg-gray-100 transition-colors"
            >
              1
            </button>
            {startPage > 2 && <span className="px-2">...</span>}
          </>
        )}

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-colors ${
              currentPage === page
                ? 'bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white border-transparent'
                : 'hover:bg-gray-100'
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2">...</span>}
            <button
              onClick={() => handlePageChange(totalPages)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border hover:bg-gray-100 transition-colors"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-10 h-10 flex items-center justify-center rounded-lg border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Каталог товаров</span>
          </h1>
          <div className="flex items-center gap-4 text-gray-900 text-lg">
            <span>
              Найдено товаров: <span className="font-semibold">{filteredProducts.length > 0 ? filteredProducts.length : products.length}</span>
            </span>
            {totalPages > 1 && (
              <>
                <span>•</span>
                <span>
                  Страница {currentPage} из {totalPages}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="lg:hidden w-full mb-4 px-4 py-3 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white rounded-lg flex items-center justify-between shadow-lg hover:shadow-xl transition-all"
        >
          <span className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span className="font-semibold">Фильтры</span>
          </span>
          <ChevronDown
            className={`w-5 h-5 transition-transform ${
              showFilters ? 'rotate-180' : ''
            }`}
          />
        </button>

        <div className="relative">
          {/* Filters Sidebar - Fixed слева, всегда видна при скролле */}
          <aside className="hidden lg:block lg:fixed lg:left-4 lg:top-24 lg:w-80 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:z-10">
            {/* Filters */}
            <div className="space-y-4">
              {/* Category Filter */}
              <div className="card p-5 bg-gradient-to-br from-white via-orange-50/40 to-amber-50/40 border-2 border-orange-200 shadow-lg rounded-2xl">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-lg bg-gradient-to-r from-[#FF6B35] to-[#F7931E] bg-clip-text text-transparent flex items-center gap-2">
                    <Filter className="w-5 h-5 text-[#FF6B35]" />
                    Категории
                  </h3>
                  {(selectedCategory || selectedSubcategory || selectedManufacturers.length > 0 || Object.keys(selectedCharacteristics).length > 0) && (
                    <button
                      onClick={handleClearFilters}
                      className="text-xs font-semibold text-[#FF6B35] hover:text-[#E85A28] transition-all px-3 py-1.5 rounded-full hover:bg-orange-50 border border-orange-200 hover:border-orange-300"
                    >
                      Сбросить все
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {CATEGORIES.map((category) => (
                    <div key={category.id}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          try {
                            setSelectedCategory(
                              selectedCategory === category.id ? '' : category.id
                            );
                            setSelectedSubcategory('');
                          } catch (error) {
                            console.error('Ошибка при выборе категории:', error);
                          }
                        }}
                        className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-300 font-medium text-sm ${
                          selectedCategory === category.id
                            ? 'bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white shadow-md'
                            : 'bg-white hover:from-orange-50 hover:to-amber-50 border border-gray-200 hover:border-orange-300 hover:shadow-sm'
                        }`}
                      >
                        <span className="mr-3 text-xl">{category.icon}</span>
                        {category.name}
                      </button>
                      
                      {/* Subcategories */}
                      {selectedCategory === category.id &&
                        category.subcategories && (
                          <div className="ml-4 mt-3 space-y-2">
                            {category.subcategories.map((sub) => (
                              <button
                                key={sub.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  try {
                                    setSelectedSubcategory(
                                      selectedSubcategory === sub.id ? '' : sub.id
                                    );
                                  } catch (error) {
                                    console.error('Ошибка при выборе подкатегории:', error);
                                  }
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm rounded-lg transition-all duration-300 font-medium ${
                                  selectedSubcategory === sub.id
                                    ? 'bg-gradient-to-r from-[#FFE66D] to-[#FFA07A] text-gray-900 shadow-md transform scale-105'
                                    : 'bg-white hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 border border-gray-200 hover:border-orange-300 hover:shadow-sm'
                                }`}
                              >
                                {sub.name}
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Manufacturer Filter */}
              {manufacturers.length > 0 && (
                <div className="card p-5 bg-gradient-to-br from-white via-cyan-50/40 to-blue-50/40 border-2 border-cyan-200 shadow-lg rounded-2xl">
                  <h3 className="font-bold text-lg mb-4 bg-gradient-to-r from-[#4ECDC4] to-[#118AB2] bg-clip-text text-transparent flex items-center gap-2">
                    <Filter className="w-5 h-5 text-[#4ECDC4]" />
                    Производитель
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {manufacturers.map((manufacturer) => (
                      <label
                        key={manufacturer}
                        className={`flex items-center space-x-3 cursor-pointer p-2.5 rounded-lg transition-all duration-300 ${
                          selectedManufacturers.includes(manufacturer)
                            ? 'bg-gradient-to-r from-[#4ECDC4] to-[#44A08D] text-white shadow-md'
                            : 'bg-white hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 border border-gray-200 hover:border-cyan-300 hover:shadow-sm'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedManufacturers.includes(manufacturer)}
                          onChange={() => toggleManufacturer(manufacturer)}
                          className={`w-5 h-5 rounded focus:ring-2 focus:ring-[#4ECDC4] ${
                            selectedManufacturers.includes(manufacturer)
                              ? 'accent-white'
                              : 'accent-[#4ECDC4]'
                          }`}
                        />
                        <span className={`text-sm font-medium ${
                          selectedManufacturers.includes(manufacturer) ? 'text-white' : 'text-gray-800'
                        }`}>{manufacturer}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Characteristics Filters */}
              {Object.keys(availableCharacteristics).length > 0 && (
                <div className="card p-5 bg-gradient-to-br from-white via-purple-50/40 to-pink-50/40 border-2 border-purple-200 shadow-lg rounded-2xl">
                  <h3 className="font-bold text-lg mb-4 bg-gradient-to-r from-[#9333EA] to-[#EC4899] bg-clip-text text-transparent flex items-center gap-2">
                    <Filter className="w-5 h-5 text-[#9333EA]" />
                    Характеристики
                  </h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                    {Object.entries(availableCharacteristics).map(([charName, values]) => (
                      <div key={charName} className="border-b border-purple-100 pb-3 last:border-0 last:pb-0">
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">{charName}</h4>
                        <div className="space-y-1.5">
                          {values.slice(0, 10).map((value) => {
                            const isSelected = selectedCharacteristics[charName]?.includes(value) || false;
                            return (
                              <label
                                key={value}
                                className={`flex items-center space-x-2 cursor-pointer p-2 rounded-md transition-all duration-200 text-xs ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-[#9333EA] to-[#EC4899] text-white shadow-sm'
                                    : 'bg-white hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 border border-gray-200 hover:border-purple-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleCharacteristic(charName, value)}
                                  className={`w-4 h-4 rounded focus:ring-2 focus:ring-purple-400 ${
                                    isSelected ? 'accent-white' : 'accent-purple-500'
                                  }`}
                                />
                                <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                                  {value}
                                </span>
                              </label>
                            );
                          })}
                          {values.length > 10 && (
                            <p className="text-xs text-gray-500 mt-1">+{values.length - 10} еще...</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Products Grid - Справа от fixed панели, с отступом чтобы не перекрывались */}
          <div className="lg:ml-[22rem]">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-12 h-12 text-[#FF6B35] animate-spin" />
              </div>
            ) : (currentProducts.length > 0 || validProducts.length > 0 || products.length > 0) ? (
              <>
                {currentProducts.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {currentProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onQuickView={setQuickViewProduct}
                        />
                      ))}
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && renderPagination()}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-600">Товары не найдены по выбранным фильтрам</p>
                    <button
                      onClick={handleClearFilters}
                      className="mt-4 px-6 py-3 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white font-semibold rounded-full hover:shadow-lg transition-all"
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 text-[#FF6B35] animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Загрузка товаров...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setQuickViewProduct(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{quickViewProduct.name}</h2>
              <button
                onClick={() => setQuickViewProduct(null)}
                className="w-10 h-10 hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {quickViewProduct.images[0] ? (
                    <img
                      src={quickViewProduct.images[0]}
                      alt={quickViewProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      📦
                    </div>
                  )}
                </div>
                
                <div>
                  {/* Очищенное описание без HTML тегов */}
                  <div className="text-gray-900 mb-6 prose prose-sm max-w-none">
                    <div 
                      dangerouslySetInnerHTML={{ __html: quickViewProduct.description }}
                      className="[&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-4 [&_li]:mb-1 [&_b]:font-semibold [&_a]:text-[#FF6B35] [&_a]:no-underline"
                    />
                  </div>
                  
                  <div className="mb-6">
                    <span className="px-4 py-2 bg-gray-100 rounded-full text-sm font-medium">
                      {quickViewProduct.manufacturer}
                    </span>
                  </div>
                  
                  {quickViewProduct.characteristics.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-3">Характеристики:</h3>
                      <div className="space-y-2">
                        {quickViewProduct.characteristics.map((char, index) => (
                          <div key={index} className="flex justify-between py-2 border-b">
                            <span className="text-gray-900">{char.name}</span>
                            <span className="font-medium">{char.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      useCatalogStore.getState().filteredProducts;
                      setQuickViewProduct(null);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    Добавить в корзину
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

