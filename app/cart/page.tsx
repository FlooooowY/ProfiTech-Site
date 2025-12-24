'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, MessageCircle, Package, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { COMPANY_INFO } from '@/constants/categories';
import { stripHtml } from '@/utils/textHelpers';
import { useTranslations } from '@/lib/i18n';

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, getTotalItems } =
    useCartStore();
  const t = useTranslations();

  const handleCheckout = () => {
    if (items.length === 0) return;

    // Формируем сообщение для WhatsApp
    let message = t('cart.whatsappGreeting') + '\n\n';
    
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.product.name}\n`;
      message += `   ${t('cart.manufacturer')}: ${item.product.manufacturer}\n`;
      message += `   ${t('cart.quantity')}: ${item.quantity} ${t('cart.pcs')}\n\n`;
    });

    message += `\n${t('cart.totalPositions')}: ${getTotalItems()} ${t('cart.pcs')}\n`;
    message += t('cart.contactForPrice');

    // Кодируем сообщение для URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappNumber = COMPANY_INFO.defaultWhatsApp.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    // Открываем WhatsApp
    window.open(whatsappUrl, '_blank');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50" style={{ paddingTop: '7.5rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-lg px-4"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="relative w-40 h-40 mx-auto mb-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B35]/20 via-[#FF7A45]/20 to-[#F7931E]/20 rounded-full blur-2xl"></div>
            <div className="relative w-full h-full bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-full flex items-center justify-center shadow-2xl">
              <ShoppingCart className="w-20 h-20 text-white" />
            </div>
          <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-2 -right-2"
          >
              <Sparkles className="w-8 h-8 text-[#FF6B35]" />
            </motion.div>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold mb-4 text-gray-900"
          >
            {t('cart.empty')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 mb-10 text-lg leading-relaxed"
          >
            {t('cart.emptyDescription')}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
          <Link
            href="/catalog"
              className="inline-flex items-center space-x-3 px-10 py-5 bg-gradient-to-r from-[#FF6B35] via-[#FF7A45] to-[#F7931E] text-white font-bold rounded-2xl hover:shadow-2xl transform hover:scale-105 transition-all text-lg"
          >
            <span>{t('cart.goToCatalog')}</span>
              <ArrowRight className="w-6 h-6" />
          </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50" style={{ paddingTop: '7.5rem' }}>
      <div className="container mx-auto px-4 py-8" style={{ paddingLeft: '32px', paddingRight: '32px' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center" style={{ gap: '10px' }}>
              <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-2xl flex items-center justify-center shadow-lg">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2 text-gray-900">
                  {t('cart.title')}
          </h1>
                <div className="flex items-center space-x-3">
          <p className="text-gray-600 text-lg">
                    {t('cart.itemsInList')}:
                  </p>
                  <span className="px-4 py-1.5 bg-gradient-to-r from-[#FF6B35]/10 to-[#F7931E]/10 text-[#FF6B35] rounded-full font-bold text-lg border-2 border-[#FF6B35]/20">
                    {getTotalItems()}
                  </span>
                </div>
              </div>
            </div>
            {items.length > 0 && (
              <motion.button
                onClick={clearCart}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 px-5 py-3 text-red-600 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-rose-500 font-semibold transition-all border-2 border-red-300 hover:border-red-500 rounded-xl shadow-sm hover:shadow-lg"
              >
                <X className="w-5 h-5" />
                <span>{t('cart.clearList')}</span>
              </motion.button>
            )}
        </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-5">
            <AnimatePresence mode="popLayout">
              {items.map((item, index) => (
                <motion.div
                  key={item.product.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -100, scale: 0.9, rotate: -5 }}
                  transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
                  className="group bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden hover:shadow-2xl hover:border-[#FF6B35]/30 transition-all duration-300"
                >
                  <div className="p-6 flex flex-col sm:flex-row gap-6">
                  {/* Product Image */}
                    <Link
                      href={`/catalog/${encodeURIComponent(item.product.id)}`}
                      className="relative w-full sm:w-48 h-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden flex-shrink-0 group/image"
                    >
                    {item.product.images && item.product.images[0] ? (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity z-10"></div>
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                            className="w-full h-full object-cover group-hover/image:scale-110 transition-transform duration-500"
                      />
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-20 h-20 text-gray-300" />
                      </div>
                    )}
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
                        <span className="text-sm font-bold text-[#FF6B35]">×{item.quantity}</span>
                  </div>
                    </Link>

                  {/* Product Info */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <Link href={`/catalog/${encodeURIComponent(item.product.id)}`}>
                        <h3 className="text-2xl font-bold mb-3 text-gray-900 hover:text-[#FF6B35] transition-colors line-clamp-2 group-hover:underline">
                      {item.product.name}
                    </h3>
                      </Link>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed flex-grow">
                      {stripHtml(item.product.description)}
                    </p>
                      <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#FF6B35]/10 to-[#F7931E]/10 text-[#FF6B35] rounded-xl text-sm font-bold border-2 border-[#FF6B35]/20 w-fit">
                        <Package className="w-4 h-4 mr-2" />
                      {item.product.manufacturer}
                    </div>
                  </div>

                    {/* Quantity Controls & Remove */}
                    <div className="flex sm:flex-col items-center justify-between sm:justify-start gap-4">
                  {/* Quantity Controls */}
                      <div className="flex items-center space-x-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-3 border-2 border-gray-200">
                        <motion.button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          whileHover={{ scale: 1.15, backgroundColor: '#FF6B35' }}
                          whileTap={{ scale: 0.9 }}
                          className="w-11 h-11 bg-white hover:bg-[#FF6B35] hover:text-white text-gray-700 rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg"
                      >
                          <Minus className="w-5 h-5" />
                        </motion.button>
                        <span className="w-16 text-center font-bold text-xl text-gray-900 bg-white px-3 py-2 rounded-lg shadow-sm">
                        {item.quantity}
                      </span>
                        <motion.button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          whileHover={{ scale: 1.15, backgroundColor: '#FF6B35' }}
                          whileTap={{ scale: 0.9 }}
                          className="w-11 h-11 bg-white hover:bg-[#FF6B35] hover:text-white text-gray-700 rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg"
                      >
                          <Plus className="w-5 h-5" />
                        </motion.button>
                    </div>

                      {/* Remove Button */}
                      <motion.button
                      onClick={() => removeItem(item.product.id)}
                        whileHover={{ scale: 1.15, rotate: 15, backgroundColor: '#ef4444' }}
                        whileTap={{ scale: 0.9 }}
                        className="w-12 h-12 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg border-2 border-red-200 hover:border-red-500"
                      title={t('cart.removeFromList')}
                    >
                      <Trash2 className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-400 overflow-hidden sticky top-24"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#FF6B35] via-[#FF7A45] to-[#F7931E] p-12">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">{t('cart.total')}</h2>
                </div>
          </div>

              <div className="px-12 py-4">
                <div className="space-y-8" style={{ marginBottom: '24px' }}>
                  <div className="flex justify-between items-center py-4 px-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Package className="w-5 h-5 text-gray-600" />
                      <span className="text-gray-700 font-semibold">{t('cart.positionsInList')}:</span>
                    </div>
                    <span className="font-bold text-xl text-gray-900 bg-white px-4 py-1.5 rounded-lg shadow-sm">
                      {items.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 px-4 bg-gradient-to-r from-[#FF6B35]/10 to-[#F7931E]/10 rounded-xl border-2 border-[#FF6B35]/20">
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="w-5 h-5 text-[#FF6B35]" />
                      <span className="text-gray-700 font-semibold">{t('cart.totalQuantity')}:</span>
                </div>
                    <span className="font-bold text-2xl text-[#FF6B35] bg-white px-4 py-1.5 rounded-lg shadow-sm">
                    {getTotalItems()} {t('cart.pcs')}
                  </span>
                </div>
              </div>

                {/* Info Box */}
                <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 rounded-2xl p-7 border-2 border-blue-200 shadow-sm" style={{ marginBottom: '24px' }}>
                  <div className="flex items-start" style={{ gap: '10px' }}>
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        <strong className="text-gray-900 block mb-1">{t('cart.priceInquiry')}:</strong>
                        {t('cart.priceInquiryDescription')}
                </p>
                    </div>
                  </div>
              </div>

                {/* Checkout Button */}
                <motion.button
                onClick={handleCheckout}
                  whileHover={{ scale: 1.02, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-6 bg-gradient-to-r from-[#FF6B35] via-[#FF7A45] to-[#F7931E] text-white font-bold rounded-2xl hover:shadow-2xl transition-all flex items-center justify-center space-x-3 text-lg mb-8 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <MessageCircle className="w-6 h-6 relative z-10" />
                  <span className="relative z-10">{t('cart.sendToWhatsApp')}</span>
                  <ArrowRight className="w-6 h-6 relative z-10 group-hover:translate-x-1 transition-transform" />
                </motion.button>

                <p className="text-xs text-gray-500 text-center mb-12">
                {t('cart.whatsappRedirect')}
              </p>

                {/* Continue Shopping */}
                <div className="pt-16 border-t-2 border-gray-200">
                <Link
                  href="/catalog"
                    className="flex items-center justify-center space-x-2 text-[#FF6B35] hover:text-[#F7931E] font-bold transition-colors group py-3 px-4 rounded-xl hover:bg-gradient-to-r hover:from-[#FF6B35]/10 hover:to-[#F7931E]/10"
                >
                    <ArrowRight className="w-5 h-5 rotate-180 group-hover:-translate-x-2 transition-transform" />
                    <span>{t('cart.continueShopping')}</span>
                </Link>
              </div>
            </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
