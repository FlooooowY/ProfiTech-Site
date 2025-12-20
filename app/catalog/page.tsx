'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Filter, X, ChevronDown, Loader2 } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { useCatalogStore } from '@/store/catalogStore';
import { CATEGORIES } from '@/constants/categories';
import { Product } from '@/types';

export default function CatalogPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const { filteredProducts, filter, setFilter, clearFilters, isLoading } =
    useCatalogStore();

  // Получение списка уникальных производителей
  const manufacturers = Array.from(
    new Set(filteredProducts.map((p) => p.manufacturer))
  ).sort();

  const currentCategory = CATEGORIES.find((c) => c.id === selectedCategory);

  useEffect(() => {
    setFilter({
      categoryId: selectedCategory || undefined,
      subcategoryId: selectedSubcategory || undefined,
      manufacturers: selectedManufacturers,
    });
  }, [selectedCategory, selectedSubcategory, selectedManufacturers, setFilter]);

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSelectedManufacturers([]);
    clearFilters();
  };

  const toggleManufacturer = (manufacturer: string) => {
    setSelectedManufacturers((prev) =>
      prev.includes(manufacturer)
        ? prev.filter((m) => m !== manufacturer)
        : [...prev, manufacturer]
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
          <p className="text-gray-600 text-lg">
            Найдено товаров: <span className="font-semibold">{filteredProducts.length}</span>
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-80">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden w-full mb-4 px-4 py-3 bg-white rounded-lg flex items-center justify-between shadow-sm"
            >
              <span className="flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <span className="font-medium">Фильтры</span>
              </span>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${
                  showFilters ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Filters */}
            <div
              className={`lg:block ${
                showFilters ? 'block' : 'hidden'
              } space-y-6`}
            >
              {/* Category Filter */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Категории</h3>
                  {(selectedCategory || selectedSubcategory || selectedManufacturers.length > 0) && (
                    <button
                      onClick={handleClearFilters}
                      className="text-sm text-[#FF6B35] hover:underline"
                    >
                      Сбросить
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {CATEGORIES.map((category) => (
                    <div key={category.id}>
                      <button
                        onClick={() => {
                          setSelectedCategory(
                            selectedCategory === category.id ? '' : category.id
                          );
                          setSelectedSubcategory('');
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedCategory === category.id
                            ? 'bg-[#FF6B35] text-white'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <span className="mr-2">{category.icon}</span>
                        {category.name}
                      </button>
                      
                      {/* Subcategories */}
                      {selectedCategory === category.id &&
                        category.subcategories && (
                          <div className="ml-4 mt-2 space-y-1">
                            {category.subcategories.map((sub) => (
                              <button
                                key={sub.id}
                                onClick={() =>
                                  setSelectedSubcategory(
                                    selectedSubcategory === sub.id ? '' : sub.id
                                  )
                                }
                                className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                  selectedSubcategory === sub.id
                                    ? 'bg-[#FFE66D] text-gray-900'
                                    : 'hover:bg-gray-100'
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
                <div className="card p-6">
                  <h3 className="font-semibold text-lg mb-4">Производитель</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {manufacturers.map((manufacturer) => (
                      <label
                        key={manufacturer}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedManufacturers.includes(manufacturer)}
                          onChange={() => toggleManufacturer(manufacturer)}
                          className="w-4 h-4 text-[#FF6B35] rounded focus:ring-[#FF6B35]"
                        />
                        <span className="text-sm">{manufacturer}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-12 h-12 text-[#FF6B35] animate-spin" />
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onQuickView={setQuickViewProduct}
                  />
                ))}
              </div>
            ) : (
              <div className="card p-12 text-center">
                <div className="w-32 h-32 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <span className="text-6xl">🔍</span>
                </div>
                <h3 className="text-2xl font-semibold mb-2">Товары не найдены</h3>
                <p className="text-gray-600 mb-6">
                  Попробуйте изменить параметры фильтрации или загрузите каталог
                </p>
                <button
                  onClick={handleClearFilters}
                  className="px-6 py-3 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white font-semibold rounded-full hover:shadow-lg transition-all"
                >
                  Сбросить фильтры
                </button>
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
                  <p className="text-gray-600 mb-6">{quickViewProduct.description}</p>
                  
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
                            <span className="text-gray-600">{char.name}</span>
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

