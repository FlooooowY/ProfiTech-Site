'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingCart, Eye, Heart } from 'lucide-react';
import { Product } from '@/types';
import { useCartStore } from '@/store/cartStore';
import { getShortDescription } from '@/utils/textHelpers';

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(product);
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  if (!product || !product.id) {
    return null;
  }

  // Безопасное кодирование ID для URL
  const productId = encodeURIComponent(product.id);

  return (
    <Link href={`/catalog/${productId}`}>
      <motion.div
        className="card overflow-hidden group cursor-pointer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300"><span class="text-6xl">📦</span></div>';
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
            <span className="text-6xl">📦</span>
          </div>
        )}

        {/* Overlay Actions */}
        <motion.div
          className="absolute inset-0 bg-black/40 flex items-center justify-center space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-[#FF6B35] hover:text-white transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleAddToCart}
            title="Добавить в корзину"
          >
            <ShoppingCart className="w-5 h-5" />
          </motion.button>
          <motion.button
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-[#FF6B35] hover:text-white transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleQuickView}
            title="Быстрый просмотр"
          >
            <Eye className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {/* Favorite Button */}
        <button
          className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
          onClick={handleToggleFavorite}
          title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
        >
          <Heart
            className={`w-5 h-5 ${
              isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-800'
            }`}
          />
        </button>

        {/* Manufacturer Badge */}
        <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-900">
          {product.manufacturer}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-[#FF6B35] transition-colors">
          {product.name}
        </h3>
        
        <p className="text-sm text-gray-800 line-clamp-2 mb-3">
          {getShortDescription(product.description, 100)}
        </p>

        {/* Characteristics */}
        {product.characteristics && product.characteristics.length > 0 && (
          <div className="mb-3 space-y-1">
            {product.characteristics.slice(0, 2).map((char, index) => (
              <div key={index} className="flex items-center text-xs text-gray-700">
                <span className="font-medium mr-2">{char.name}:</span>
                <span className="text-gray-900">{char.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Price Info */}
        <div className="mb-3 py-2 px-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
          <p className="text-sm font-medium text-orange-800 text-center">
            💬 Для уточнения цены свяжитесь с нами
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleAddToCart}
          className="w-full py-2.5 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white rounded-lg font-medium hover:shadow-lg transform hover:scale-105 transition-all"
        >
          Добавить в запрос
        </button>
      </div>
    </motion.div>
    </Link>
  );
}

