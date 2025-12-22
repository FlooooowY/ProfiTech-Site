'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Filter, X, ChevronDown, Loader2, ChevronLeft, ChevronRight, Search, ChevronRight as ChevronRightIcon, ShoppingCart } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import FilterSidebar from '@/components/FilterSidebar';
import { useCatalogStore } from '@/store/catalogStore';
import { useCartStore } from '@/store/cartStore';
import { CATEGORIES } from '@/constants/categories';
import { Product } from '@/types';

const PRODUCTS_PER_PAGE = 24;

export default function CatalogPage() {
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  // Примененные фильтры (используются для загрузки товаров)
  const [appliedCategory, setAppliedCategory] = useState<string>('');
  const [appliedSubcategories, setAppliedSubcategories] = useState<string[]>([]);
  const [appliedManufacturers, setAppliedManufacturers] = useState<string[]>([]);
  const [appliedCharacteristics, setAppliedCharacteristics] = useState<{ [key: string]: string[] }>({});
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [categorySearch, setCategorySearch] = useState('');
  const [manufacturerSearch, setManufacturerSearch] = useState('');
  const [showAllManufacturers, setShowAllManufacturers] = useState(false);
  const [expandedCharacteristics, setExpandedCharacteristics] = useState<{ [key: string]: boolean }>({ other: false });
  // Временные фильтры (для UI, применяются только после нажатия "Применить")
  const [pendingFilters, setPendingFilters] = useState({
    category: '',
    subcategories: [] as string[],
    manufacturers: [] as string[],
    characteristics: {} as { [key: string]: string[] }
  });

  const { filteredProducts, setProducts, clearFilters, isLoading, filter, searchQuery } = useCatalogStore();
  const { addItem } = useCartStore();
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [availableCharacteristics, setAvailableCharacteristics] = useState<{ [key: string]: string[] }>({});
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Загрузка данных через API с пагинацией (оптимизированная)
  const loadProducts = useCallback(async () => {
    try {
      useCatalogStore.setState({ isLoading: true });
      
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(PRODUCTS_PER_PAGE));
      
      if (appliedCategory) params.set('categoryId', appliedCategory);
      if (appliedSubcategories.length > 0) {
        // Проверяем, выбраны ли все подкатегории
        const selectedCategory = CATEGORIES.find(c => c.id === appliedCategory);
        const allSubcategories = selectedCategory?.subcategories || [];
        const shouldTreatAsCategory = allSubcategories.length > 0 && 
                                      appliedSubcategories.length === allSubcategories.length &&
                                      allSubcategories.every(sub => appliedSubcategories.includes(sub.id));
        
        if (!shouldTreatAsCategory) {
          params.set('subcategories', appliedSubcategories.join(','));
        }
      }
      if (appliedManufacturers.length > 0) params.set('manufacturers', appliedManufacturers.join(','));
      if (Object.keys(appliedCharacteristics).length > 0) {
        params.set('characteristics', JSON.stringify(appliedCharacteristics));
      }
      if (searchQuery && searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const startTime = performance.now();
      const response = await fetch(`/api/catalog?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: AbortSignal.timeout(30000) // Таймаут 30 секунд
      });
      
      if (response.ok) {
        const data = await response.json();
        const loadTime = performance.now() - startTime;
        
        setProducts(data.products || []);
        useCatalogStore.setState({ 
          filteredProducts: data.products || [],
          isLoading: false 
        });
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalProducts(data.pagination?.total || 0);
      } else {
        console.error('[Catalog] Failed to load products:', response.status);
        useCatalogStore.setState({ 
          filteredProducts: [],
          isLoading: false 
        });
      }
    } catch (error) {
      console.error('[Catalog] Error loading products:', error);
      useCatalogStore.setState({ 
        filteredProducts: [],
        isLoading: false 
      });
    }
  }, [currentPage, appliedCategory, appliedSubcategories, appliedManufacturers, appliedCharacteristics, searchQuery, setProducts]);

  // Загрузка статистики (производители, характеристики) - обновляется сразу при изменении pendingFilters
  const loadStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (pendingFilters.category) {
        params.set('categoryId', pendingFilters.category);
        
        // Проверяем, выбраны ли все подкатегории для этой категории
        const selectedCategory = CATEGORIES.find(c => c.id === pendingFilters.category);
        const allSubcategories = selectedCategory?.subcategories || [];
        const selectedSubcategories = pendingFilters.subcategories || [];
        
        // Если выбраны все подкатегории, не передаем subcategories в API
        const shouldTreatAsCategory = allSubcategories.length > 0 && 
                                      selectedSubcategories.length === allSubcategories.length &&
                                      allSubcategories.every(sub => selectedSubcategories.includes(sub.id));
        
        if (!shouldTreatAsCategory && selectedSubcategories.length > 0) {
          params.set('subcategories', selectedSubcategories.join(','));
        }
      }
      if (pendingFilters.manufacturers.length > 0) params.set('manufacturers', pendingFilters.manufacturers.join(','));
      
      console.log('[Catalog] Loading stats with params:', {
        category: pendingFilters.category,
        subcategories: pendingFilters.subcategories,
        subcategoriesCount: pendingFilters.subcategories.length,
        manufacturers: pendingFilters.manufacturers.length,
        url: `/api/catalog/stats?${params.toString()}`
      });
      
      const response = await fetch(`/api/catalog/stats?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('[Catalog] Stats response:', {
          manufacturersCount: data.manufacturers?.length || 0,
          characteristicsCount: Object.keys(data.characteristics || {}).length,
          totalProducts: data.totalProducts || 0
        });
        
        // Обновляем производителей и характеристики только если они есть в ответе
        // Не сбрасываем на пустые массивы, если ответ содержит данные
        if (data.manufacturers && Array.isArray(data.manufacturers)) {
          setManufacturers(data.manufacturers);
        } else if (data.manufacturers === null || data.manufacturers === undefined) {
          // Сбрасываем только если явно null/undefined, не если пустой массив
          setManufacturers([]);
        }
        
        if (data.characteristics && typeof data.characteristics === 'object') {
          setAvailableCharacteristics(data.characteristics);
        } else if (data.characteristics === null || data.characteristics === undefined) {
          // Сбрасываем только если явно null/undefined
          setAvailableCharacteristics({});
        }
        if (data.categories && Array.isArray(data.categories)) {
          setAvailableCategories(data.categories);
        } else {
          setAvailableCategories([]);
        }
      }
    } catch (error) {
      // Игнорируем ошибки загрузки статистики
    }
  }, [pendingFilters.category, pendingFilters.subcategories, pendingFilters.manufacturers]);

  // Загрузка статистики при монтировании
  useEffect(() => {
    loadStats();
  }, []);

  // Загрузка статистики при изменении pendingFilters (с debounce для оптимизации)
  // Важно: вызывается при каждом изменении subcategories, даже если category не менялась
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadStats();
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [loadStats, pendingFilters.category, pendingFilters.subcategories, pendingFilters.manufacturers]);

  // Загрузка товаров только при изменении примененных фильтров (не pending)
  useEffect(() => {
    // Не блокируем загрузку, если уже идет загрузка - это может быть новый запрос с другими параметрами
    const timeoutId = setTimeout(() => {
      loadProducts();
    }, 100); // Уменьшил debounce для более быстрой реакции

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, appliedCategory, appliedSubcategories, appliedManufacturers, appliedCharacteristics, searchQuery]);

  // Слушаем обновления поиска из Header
  useEffect(() => {
    const handleSearchUpdate = () => {
      setCurrentPage(1); // Сбрасываем на первую страницу при новом поиске
      loadProducts();
    };

    window.addEventListener('searchUpdated', handleSearchUpdate);
    return () => window.removeEventListener('searchUpdated', handleSearchUpdate);
  }, [loadProducts]);


  // Применение фильтров из URL
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    const subcategoryFromUrl = searchParams.get('subcategory');
    
    if (categoryFromUrl) {
      setTimeout(() => {
        setAppliedCategory(categoryFromUrl);
        setPendingFilters(prev => ({ ...prev, category: categoryFromUrl }));
      }, 0);
    }
    if (subcategoryFromUrl) {
      setTimeout(() => {
        setAppliedSubcategories([subcategoryFromUrl]);
        setPendingFilters(prev => ({ ...prev, subcategories: [subcategoryFromUrl] }));
      }, 0);
    }
  }, [searchParams]);

  // Синхронизация pendingFilters с filter из store (если есть)
  useEffect(() => {
    if (filter?.characteristics && Object.keys(filter.characteristics).length > 0) {
      setPendingFilters(prev => ({
        ...prev,
        characteristics: filter.characteristics
      }));
    }
  }, [filter]);

  // Используем товары из store (загружаются через API с пагинацией)
  const currentProducts = useMemo(() => {
    return filteredProducts.filter(p => p && p.id);
  }, [filteredProducts]);

  // Сортируем производителей: выбранные сверху
  const sortedManufacturers = useMemo(() => {
    const selected = manufacturers.filter(m => pendingFilters.manufacturers.includes(m)).sort();
    const unselected = manufacturers.filter(m => !pendingFilters.manufacturers.includes(m)).sort();
    return [...selected, ...unselected];
  }, [manufacturers, pendingFilters.manufacturers]);

  // Фильтруем категории по поиску
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return CATEGORIES;
    const searchLower = categorySearch.toLowerCase();
    return CATEGORIES.filter(cat => 
      cat.name.toLowerCase().includes(searchLower) ||
      cat.subcategories?.some(sub => sub.name.toLowerCase().includes(searchLower))
    );
  }, [categorySearch]);

  // Фильтруем производителей по поиску
  const filteredManufacturers = useMemo(() => {
    let filtered = sortedManufacturers;
    if (manufacturerSearch.trim()) {
      const searchLower = manufacturerSearch.toLowerCase();
      filtered = filtered.filter(m => m.toLowerCase().includes(searchLower));
    }
    if (!showAllManufacturers) {
      filtered = filtered.slice(0, 10);
    }
    return filtered;
  }, [sortedManufacturers, manufacturerSearch, showAllManufacturers]);

  // Применение фильтров по кнопке
  const handleApplyFilters = () => {
    // Применяем pending фильтры к applied фильтрам
    setAppliedCategory(pendingFilters.category);
    setAppliedSubcategories(pendingFilters.subcategories || []);
    setAppliedManufacturers(pendingFilters.manufacturers);
    setAppliedCharacteristics(pendingFilters.characteristics);
    setCurrentPage(1);
  };

  // Инициализация pendingFilters при монтировании
  useEffect(() => {
    setPendingFilters({
      category: appliedCategory,
      subcategories: appliedSubcategories,
      manufacturers: appliedManufacturers,
      characteristics: appliedCharacteristics
    });
  }, []); // Только при монтировании

  // Разделение характеристик на основные и остальные
  const mainCharacteristics = useMemo(() => {
    const mainCharNames = ['Напряжение', 'Мощность', 'Ширина', 'Глубина', 'Высота', 'Вес'];
    const main: { [key: string]: string[] } = {};
    const other: { [key: string]: string[] } = {};
    
    Object.entries(availableCharacteristics).forEach(([charName, values]) => {
      if (mainCharNames.includes(charName)) {
        main[charName] = values;
      } else {
        other[charName] = values;
      }
    });
    
    return { main, other };
  }, [availableCharacteristics]);

  // Сброс на первую страницу при изменении примененных фильтров
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [appliedCategory, appliedSubcategories, appliedManufacturers, appliedCharacteristics]);

  const handleResetFilters = () => {
    // Сбрасываем и pending, и applied фильтры
    setPendingFilters({
      category: '',
      subcategories: [],
      manufacturers: [],
      characteristics: {}
    });
    setAppliedCategory('');
    setAppliedSubcategories([]);
    setAppliedManufacturers([]);
    setAppliedCharacteristics({});
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
      const isSelected = pendingFilters.manufacturers.includes(manufacturer);
      const newManufacturers = isSelected
        ? pendingFilters.manufacturers.filter((m) => m !== manufacturer)
        : [...pendingFilters.manufacturers, manufacturer];
      
      setPendingFilters(prev => ({
        ...prev,
        manufacturers: newManufacturers
      }));
      
      // Обратная синхронизация: обновляем доступные категории при выборе производителя
      // Это происходит сразу, без применения фильтров
      if (newManufacturers.length > 0) {
        const params = new URLSearchParams();
        params.set('manufacturers', newManufacturers.join(','));
        
        fetch(`/api/catalog/stats?${params.toString()}`)
          .then(res => res.json())
          .then(data => {
            if (data.categories && Array.isArray(data.categories)) {
              setAvailableCategories(data.categories);
              // Если выбрана категория, которой нет в доступных, сбрасываем её
              if (pendingFilters.category && !data.categories.includes(pendingFilters.category)) {
                setPendingFilters(prev => ({
                  ...prev,
                  category: '',
                  subcategories: []
                }));
              }
            }
          })
          .catch(() => {});
      } else {
        setAvailableCategories([]);
      }
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
      <div className="flex items-center justify-center space-x-2" style={{ marginTop: '60px', marginBottom: '20px' }}>
        <motion.button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 hover:border-[#FF6B35] hover:bg-[#FF6B35] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-all duration-300 shadow-sm hover:shadow-md"
          whileHover={{ scale: currentPage === 1 ? 1 : 1.05 }}
          whileTap={{ scale: currentPage === 1 ? 1 : 0.95 }}
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        {startPage > 1 && (
          <>
            <motion.button
              onClick={() => handlePageChange(1)}
              className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 hover:border-[#FF6B35] hover:bg-[#FF6B35] hover:text-white transition-all duration-300 shadow-sm hover:shadow-md font-semibold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              1
            </motion.button>
            {startPage > 2 && <span className="px-2 text-gray-400 font-bold">...</span>}
          </>
        )}

        {pages.map((page) => (
          <motion.button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all duration-300 font-semibold shadow-sm ${
              currentPage === page
                ? 'bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white border-transparent shadow-md scale-105'
                : 'border-gray-200 hover:border-[#FF6B35] hover:bg-[#FF6B35] hover:text-white hover:shadow-md'
            }`}
            whileHover={{ scale: currentPage === page ? 1.05 : 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {page}
          </motion.button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2 text-gray-400 font-bold">...</span>}
            <motion.button
              onClick={() => handlePageChange(totalPages)}
              className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 hover:border-[#FF6B35] hover:bg-[#FF6B35] hover:text-white transition-all duration-300 shadow-sm hover:shadow-md font-semibold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {totalPages}
            </motion.button>
          </>
        )}

        <motion.button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 hover:border-[#FF6B35] hover:bg-[#FF6B35] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-all duration-300 shadow-sm hover:shadow-md"
          whileHover={{ scale: currentPage === totalPages ? 1 : 1.05 }}
          whileTap={{ scale: currentPage === totalPages ? 1 : 0.95 }}
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingTop: '7.5rem', paddingBottom: '120px' }}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-16 md:mb-20">
          <div className="flex flex-col items-center gap-4 mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-center">
              <span className="gradient-text">Каталог товаров</span>
            </h1>
          </div>
          {/* Статистика справа */}
          <div className="flex items-center gap-3 text-gray-700 justify-end">
            <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-200">
              <span className="text-sm font-medium text-gray-600">Найдено: </span>
              <span className="text-lg font-bold text-[#FF6B35]">{totalProducts}</span>
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-200">
                <span className="text-sm font-medium text-gray-600">Страница </span>
                <span className="text-lg font-bold text-[#FF6B35]">{currentPage}</span>
                <span className="text-sm font-medium text-gray-600"> из {totalPages}</span>
              </div>
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
          {/* Filters Sidebar - Fixed слева, прилипает к подвалу */}
          <FilterSidebar headerHeight={96}>
            <div className="p-4 space-y-4">
              {/* Заголовок */}
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Фильтры</h2>

              {/* Category Filter */}
              <div className="space-y-3">
                <h3 className="font-bold text-base text-gray-900">Категории</h3>
                
                {/* Поиск по категориям */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Поиск категорий..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] focus:bg-white transition-all"
                  />
                  <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                </div>

                <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                  {filteredCategories.map((category) => (
                    <div key={category.id}>
                      <div className="flex items-center">
                        <ChevronRightIcon className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const newCategory = pendingFilters.category === category.id ? '' : category.id;
                            setPendingFilters(prev => ({
                              ...prev,
                              category: newCategory,
                              // При смене категории очищаем подкатегории только если категория снята
                              subcategories: newCategory === '' ? [] : prev.subcategories.filter(sub => {
                                // Оставляем только те подкатегории, которые принадлежат новой категории
                                const cat = CATEGORIES.find(c => c.id === newCategory);
                                return cat?.subcategories?.some(s => s.id === sub) || false;
                              })
                            }));
                          }}
                          className={`flex-1 text-left py-2 px-2 rounded transition-colors text-sm ${
                            pendingFilters.category === category.id
                              ? 'text-[#FF6B35] font-semibold'
                              : 'text-gray-700 hover:text-[#FF6B35]'
                          }`}
                        >
                          {category.name}
                        </button>
                      </div>
                      {/* Подкатегории */}
                      {pendingFilters.category === category.id && category.subcategories && category.subcategories.length > 0 && (
                        <div className="ml-6 mt-1 space-y-1">
                          {category.subcategories.map((sub) => (
                            <label
                              key={sub.id}
                              className="flex items-center space-x-2 cursor-pointer py-1 hover:bg-gray-50 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={pendingFilters.subcategories?.includes(sub.id) || false}
                                onChange={() => {
                                  setPendingFilters(prev => {
                                    const current = prev.subcategories || [];
                                    const updated = current.includes(sub.id)
                                      ? current.filter(id => id !== sub.id)
                                      : [...current, sub.id];
                                    return {
                                      ...prev,
                                      subcategories: updated
                                    };
                                  });
                                }}
                                className="w-4 h-4 rounded accent-[#FF6B35]"
                              />
                              <span className="text-xs text-gray-600">{sub.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Manufacturer Filter */}
              <div className="space-y-3">
                <h3 className="font-bold text-base text-gray-900">Производитель</h3>
                
                {/* Поиск по производителям */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Поиск производителей..."
                    value={manufacturerSearch}
                    onChange={(e) => setManufacturerSearch(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] focus:bg-white transition-all"
                  />
                  <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                </div>

                {isLoadingStats ? (
                  <div className="space-y-2 py-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : sortedManufacturers.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {filteredManufacturers.map((manufacturer) => (
                      <label
                        key={manufacturer}
                        className="flex items-center space-x-3 cursor-pointer py-2 hover:bg-gray-50 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={pendingFilters.manufacturers.includes(manufacturer)}
                          onChange={() => {
                            setPendingFilters(prev => ({
                              ...prev,
                              manufacturers: prev.manufacturers.includes(manufacturer)
                                ? prev.manufacturers.filter(m => m !== manufacturer)
                                : [...prev.manufacturers, manufacturer]
                            }));
                          }}
                          className="w-5 h-5 rounded accent-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]"
                        />
                        <span className="text-sm text-gray-700">{manufacturer}</span>
                      </label>
                    ))}
                    {sortedManufacturers.length > 10 && !showAllManufacturers && (
                      <button
                        onClick={() => setShowAllManufacturers(true)}
                        className="text-sm text-[#FF6B35] hover:underline flex items-center gap-1 w-full py-2"
                      >
                        Показать всё
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4 text-center">Нет доступных производителей</p>
                )}
              </div>

              {/* Основные характеристики */}
              <div className="space-y-4">
                <h3 className="font-bold text-base text-gray-900">Характеристики</h3>
                {isLoadingStats ? (
                  <div className="space-y-3 py-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-6 bg-gray-200 rounded animate-pulse" />
                        <div className="space-y-1.5">
                          {[1, 2, 3].map((j) => (
                            <div key={j} className="h-5 bg-gray-100 rounded animate-pulse" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : Object.keys(mainCharacteristics.main).length > 0 ? (
                  <div>
                    {Object.entries(mainCharacteristics.main).map(([charName, values]) => (
                      <div key={charName} className="space-y-2">
                      <button
                        onClick={() => setExpandedCharacteristics(prev => ({ ...prev, [charName]: prev[charName] === undefined ? false : !prev[charName] }))}
                        className="w-full font-bold text-base text-gray-900 flex items-center justify-between hover:text-[#FF6B35] transition-colors"
                      >
                        <span>{charName}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${(expandedCharacteristics[charName] === undefined || expandedCharacteristics[charName] !== false) ? 'rotate-180' : ''}`} />
                      </button>
                      {(expandedCharacteristics[charName] === undefined || expandedCharacteristics[charName] !== false) && (
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {values.slice(0, 10).map((value) => {
                            const isSelected = pendingFilters.characteristics[charName]?.includes(value) || false;
                            return (
                              <label
                                key={value}
                                className="flex items-center space-x-3 cursor-pointer py-1.5 hover:bg-gray-50 rounded transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setPendingFilters(prev => {
                                      const current = prev.characteristics[charName] || [];
                                      const updated = isSelected
                                        ? current.filter(v => v !== value)
                                        : [...current, value];
                                      
                                      const newChars = { ...prev.characteristics };
                                      if (updated.length === 0) {
                                        delete newChars[charName];
                                      } else {
                                        newChars[charName] = updated;
                                      }
                                      
                                      return { ...prev, characteristics: newChars };
                                    });
                                  }}
                                  className="w-5 h-5 rounded accent-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]"
                                />
                                <span className="text-sm text-gray-700">{value}</span>
                              </label>
                            );
                          })}
                          {values.length > 10 && (
                            <p className="text-xs text-gray-500 mt-1">+{values.length - 10} еще...</p>
                          )}
                        </div>
                      )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4 text-center">Нет доступных характеристик</p>
                )}
              </div>

              {/* Остальные характеристики (свернутые) */}
              {Object.keys(mainCharacteristics.other).length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setExpandedCharacteristics(prev => ({ ...prev, other: !prev.other }))}
                    className="w-full flex items-center justify-between text-gray-700 hover:text-[#FF6B35] transition-colors"
                  >
                    <span className="font-bold text-base">Другие характеристики</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedCharacteristics.other ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedCharacteristics.other && (
                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                      {Object.entries(mainCharacteristics.other).map(([charName, values]) => (
                        <div key={charName} className="space-y-2">
                          <h4 className="font-semibold text-sm text-gray-700">{charName}</h4>
                          <div className="space-y-1.5">
                            {values.slice(0, 5).map((value) => {
                              const isSelected = pendingFilters.characteristics[charName]?.includes(value) || false;
                              return (
                                <label
                                  key={value}
                                  className="flex items-center space-x-2 cursor-pointer py-1 hover:bg-gray-50 rounded"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      setPendingFilters(prev => {
                                        const current = prev.characteristics[charName] || [];
                                        const updated = isSelected
                                          ? current.filter(v => v !== value)
                                          : [...current, value];
                                        
                                        const newChars = { ...prev.characteristics };
                                        if (updated.length === 0) {
                                          delete newChars[charName];
                                        } else {
                                          newChars[charName] = updated;
                                        }
                                        
                                        return { ...prev, characteristics: newChars };
                                      });
                                    }}
                                    className="w-4 h-4 rounded accent-[#FF6B35]"
                                  />
                                  <span className="text-xs text-gray-600">{value}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Кнопки применения и сброса */}
              <div className="sticky bottom-0 bg-white pt-4 pb-2 space-y-2 border-t border-gray-200">
                <button
                  onClick={handleApplyFilters}
                  className="w-full py-3 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  Применить
                </button>
                <button
                  onClick={handleResetFilters}
                  className="w-full py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                >
                  Сбросить
                </button>
              </div>
            </div>
          </FilterSidebar>

          {/* Products Grid - Справа от fixed панели, с отступом чтобы не перекрывались */}
          <div className="lg:ml-0" style={{ marginLeft: '0' }}>
            <style dangerouslySetInnerHTML={{ __html: `
              @media (min-width: 1024px) {
                .products-grid-wrapper {
                  margin-left: calc(1rem + 20rem + 3rem) !important;
                }
              }
            `}} />
            <div className="products-grid-wrapper">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-12 h-12 text-[#FF6B35] animate-spin" />
              </div>
            ) : currentProducts.length > 0 ? (
              <>
                {currentProducts.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
                      {currentProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onQuickView={setQuickViewProduct}
                        />
                      ))}
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="catalog-pagination">
                        {renderPagination()}
                      </div>
                    )}
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
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => setQuickViewProduct(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-gray-200/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-white to-gray-50 border-b border-gray-200/50 p-6 flex items-center justify-between z-10 backdrop-blur-sm">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-2 line-clamp-2">{quickViewProduct.name}</h2>
                {quickViewProduct.manufacturer && quickViewProduct.manufacturer !== 'Не указан' && (
                  <span className="inline-block px-4 py-1.5 bg-gradient-to-r from-[#FF6B35]/10 to-[#F7931E]/10 text-[#FF6B35] rounded-full text-sm font-bold border border-[#FF6B35]/20">
                    {quickViewProduct.manufacturer}
                  </span>
                )}
              </div>
              <motion.button
                onClick={() => setQuickViewProduct(null)}
                className="w-12 h-12 hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors ml-4 flex-shrink-0"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-6 h-6 text-gray-600" />
              </motion.button>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(90vh-120px)] custom-scrollbar">
              <div className="p-8">
                <div className="grid lg:grid-cols-2 gap-10">
                  {/* Image */}
                  <div className="space-y-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="aspect-square bg-gradient-to-br from-gray-50 to-white rounded-3xl overflow-hidden shadow-xl border border-gray-200/50 p-8"
                    >
                      {quickViewProduct.images && quickViewProduct.images[0] ? (
                        <img
                          src={quickViewProduct.images[0]}
                          alt={quickViewProduct.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <span className="text-9xl">📦</span>
                        </div>
                      )}
                    </motion.div>
                    
                    {/* Thumbnails */}
                    {quickViewProduct.images && quickViewProduct.images.length > 1 && (
                      <div className="grid grid-cols-4 gap-3">
                        {quickViewProduct.images.slice(0, 4).map((image, index) => (
                          <motion.button
                            key={index}
                            onClick={() => {}}
                            className="aspect-square rounded-2xl overflow-hidden border-2 border-gray-200 hover:border-[#FF6B35] transition-all shadow-md hover:shadow-lg"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <img
                              src={image}
                              alt={`${quickViewProduct.name} - ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-6">
                    {/* Price Info */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="p-5 bg-gradient-to-r from-[#FF6B35]/10 via-[#F7931E]/10 to-[#FF6B35]/10 rounded-2xl border-2 border-[#FF6B35]/20 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">💬</span>
                        <p className="text-lg font-bold text-[#FF6B35]">
                          Цена по запросу
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 ml-11">
                        Свяжитесь с нами для уточнения актуальной цены и наличия
                      </p>
                    </motion.div>

                    {/* Description */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="bg-white rounded-2xl p-6 border border-gray-200/50 shadow-sm"
                    >
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Описание</h3>
                      <div 
                        dangerouslySetInnerHTML={{ __html: quickViewProduct.description }}
                        className="prose prose-base max-w-none text-gray-700 leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-3 [&_li]:mb-2 [&_b]:font-bold [&_strong]:font-bold [&_a]:text-[#FF6B35] [&_a]:no-underline [&_a]:hover:underline"
                      />
                    </motion.div>
                    
                    {/* Characteristics */}
                    {quickViewProduct.characteristics && quickViewProduct.characteristics.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white rounded-2xl p-6 border border-gray-200/50 shadow-sm"
                      >
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Характеристики</h3>
                        <div className="space-y-3">
                          {quickViewProduct.characteristics.slice(0, 6).map((char, index) => (
                            <div 
                              key={index} 
                              className={`flex justify-between items-center py-3 px-4 rounded-xl ${
                                index % 2 === 0 
                                  ? 'bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-200/50' 
                                  : 'bg-white border border-gray-200/50'
                              }`}
                            >
                              <span className="text-gray-700 font-semibold">{char.name}</span>
                              <span className="text-gray-900 font-bold text-right ml-4">
                                {char.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    
                    {/* Action Buttons */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="space-y-3"
                    >
                      <motion.button
                        onClick={() => {
                          if (quickViewProduct) {
                            addItem(quickViewProduct);
                          }
                          setQuickViewProduct(null);
                        }}
                        className="w-full py-5 bg-gradient-to-r from-[#FF6B35] via-[#FF7A45] to-[#F7931E] text-white font-bold text-base rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center space-x-3"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <ShoppingCart className="w-6 h-6" />
                        <span>Добавить в запрос</span>
                      </motion.button>
                      
                      <Link
                        href={`/catalog/${encodeURIComponent(quickViewProduct.id)}`}
                        onClick={() => setQuickViewProduct(null)}
                        className="block w-full py-4 bg-white border-2 border-[#FF6B35] text-[#FF6B35] font-bold text-base rounded-2xl shadow-md hover:shadow-lg transition-all text-center hover:bg-[#FF6B35] hover:text-white"
                      >
                        Подробнее о товаре
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

