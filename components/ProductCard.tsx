'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingCart, Eye, Heart, Plus, Minus, Star, CheckCircle2 } from 'lucide-react';
import { Product } from '@/types';
import { useCartStore } from '@/store/cartStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { getShortDescription } from '@/utils/textHelpers';
import { useTranslations } from '@/lib/i18n';
import { getProductName, getProductDescription, getTranslatedCharacteristic } from '@/lib/productTranslations';

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { addItem, updateQuantity, items } = useCartStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const t = useTranslations();
  
  // Получаем количество товара в корзине
  const cartQuantity = useMemo(() => {
    const cartItem = items.find(item => item.product.id === product.id);
    return cartItem?.quantity || 0;
  }, [items, product.id]);
  
  // Проверяем, в избранном ли товар
  const isProductFavorite = isFavorite(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
  };

  const handleIncreaseQuantity = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartQuantity === 0) {
      addItem(product, 1);
    } else {
      updateQuantity(product.id, cartQuantity + 1);
    }
  };

  const handleDecreaseQuantity = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartQuantity > 1) {
      updateQuantity(product.id, cartQuantity - 1);
    } else {
      updateQuantity(product.id, 0);
    }
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
    toggleFavorite(product);
  };

  if (!product || !product.id) {
    return null;
  }

  // Безопасное кодирование ID для URL
  const productId = encodeURIComponent(product.id);

  return (
    <Link href={`/catalog/${productId}`}>
      <motion.div
        className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-200/50 relative z-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -8 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
      {/* Image Container */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden rounded-t-3xl">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 ease-out p-6"
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

        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Top Badges */}
        <div className="absolute top-3 right-3 z-20">
          {/* Favorite Button */}
          <motion.button
            className="w-10 h-10 bg-white/98 backdrop-blur-md rounded-full flex items-center justify-center shadow-xl hover:bg-red-50 border border-gray-200/50 transition-all duration-300"
            whileHover={{ scale: 1.15, rotate: 10 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleFavorite}
            title={isProductFavorite ? t('product.removeFromFavorites') : t('product.addToFavorites')}
          >
            <Heart
              className={`w-5 h-5 transition-all duration-300 ${
                isProductFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700'
              }`}
            />
          </motion.button>
        </div>

        {/* Stock Status Badge */}
        <div className="absolute bottom-3 left-3 z-20">
          <div className="px-3 py-1.5 bg-green-500/95 backdrop-blur-md rounded-full flex items-center gap-1.5 shadow-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-bold text-white">{t('product.inStock')}</span>
          </div>
        </div>

        {/* Overlay Actions */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center space-x-4 pointer-events-none"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
          transition={{ duration: 0.3 }}
        >
          <motion.button
            className="w-16 h-16 bg-white/98 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-2xl hover:bg-[#FF6B35] hover:text-white transition-all duration-300 pointer-events-auto group/btn border border-gray-200/50"
            whileHover={{ scale: 1.15, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleAddToCart}
            title={t('product.addToCart')}
          >
            <ShoppingCart className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
          </motion.button>
          <motion.button
            className="w-16 h-16 bg-white/98 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-2xl hover:bg-[#FF6B35] hover:text-white transition-all duration-300 pointer-events-auto group/btn border border-gray-200/50"
            whileHover={{ scale: 1.15, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleQuickView}
            title={t('product.quickView')}
          >
            <Eye className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
          </motion.button>
        </motion.div>
      </div>

      {/* Content */}
      <div className="px-6 pt-7 pb-7 bg-white rounded-b-3xl">
        {/* Product Name */}
        <h3 className="font-bold text-xl mb-5 line-clamp-2 text-gray-900 group-hover:text-[#FF6B35] transition-colors duration-300 leading-tight min-h-[3.5rem]">
          {getProductName(product)}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-gray-500 line-clamp-2 mb-6 leading-relaxed">
          {getShortDescription(getProductDescription(product), 90)}
        </p>

        {/* Key Characteristics - Compact Design */}
        {product.characteristics && product.characteristics.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-3">
            {product.characteristics.slice(0, 2).map((char, index) => {
              const translatedChar = getTranslatedCharacteristic(char);
              return (
                <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-3 border border-gray-200/50">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{translatedChar.name}</div>
                  <div className="text-sm font-bold text-gray-900">{translatedChar.value}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Price Info - Enhanced */}
        <div className="mb-5 py-4 px-4 bg-gradient-to-r from-[#FF6B35]/8 via-[#F7931E]/8 to-[#FF6B35]/8 rounded-2xl border-2 border-[#FF6B35]/15 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg">💬</span>
            <p className="text-xs font-bold text-[#FF6B35] uppercase tracking-wider">
              {t('product.checkPrice')}
            </p>
          </div>
        </div>

        {/* Action Button / Quantity Controls */}
        {cartQuantity === 0 ? (
          <motion.button
            onClick={handleAddToCart}
            className="w-full py-8 bg-gradient-to-r from-[#FF6B35] via-[#FF7A45] to-[#F7931E] text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-visible group/btn"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="relative z-10 flex items-center justify-center space-x-3">
              <ShoppingCart className="w-6 h-6" />
              <span>{t('product.addToRequest')}</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-[#F7931E] via-[#FF7A45] to-[#FF6B35] opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
          </motion.button>
        ) : (
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleDecreaseQuantity}
              className="flex-1 py-6 bg-white border-2 border-[#FF6B35] text-[#FF6B35] rounded-2xl font-bold text-base shadow-lg hover:shadow-xl hover:bg-[#FF6B35] hover:text-white transition-all duration-300 flex items-center justify-center group"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Minus className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </motion.button>
            <div className="flex-1 py-6 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center min-w-[100px] border-2 border-transparent">
              <span className="text-2xl">{cartQuantity}</span>
            </div>
            <motion.button
              onClick={handleIncreaseQuantity}
              className="flex-1 py-6 bg-white border-2 border-[#FF6B35] text-[#FF6B35] rounded-2xl font-bold text-base shadow-lg hover:shadow-xl hover:bg-[#FF6B35] hover:text-white transition-all duration-300 flex items-center justify-center group"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
    </Link>
  );
}

