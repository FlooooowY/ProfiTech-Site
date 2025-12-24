'use client';

import { motion } from 'framer-motion';
import { Heart, ShoppingCart } from 'lucide-react';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useCartStore } from '@/store/cartStore';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import { useTranslations } from '@/lib/i18n';

export default function FavoritesPage() {
  const { favorites, clearFavorites } = useFavoritesStore();
  const { addItem } = useCartStore();
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">
                <span className="gradient-text">{t('common.favorites')}</span>
              </h1>
              <p className="text-gray-600 text-lg">
                {favorites.length === 0 
                  ? t('favorites.emptyDescription') 
                  : `${t('favorites.found')}: ${favorites.length}`}
              </p>
            </div>
            {favorites.length > 0 && (
              <button
                onClick={clearFavorites}
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
              >
                {t('favorites.clear')}
              </button>
            )}
          </div>
        </div>

        {/* Favorites Grid */}
        {favorites.length === 0 ? (
          <div className="text-center py-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-block mb-6"
            >
              <Heart className="w-24 h-24 text-gray-300 mx-auto" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('favorites.empty')}
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {t('favorites.emptyMessage')}
            </p>
            <Link
              href="/catalog"
              className="inline-block px-8 py-4 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white font-bold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all"
            >
              {t('favorites.goToCatalog')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
            {favorites.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


