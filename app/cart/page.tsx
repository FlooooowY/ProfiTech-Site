'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { COMPANY_INFO } from '@/constants/categories';
import { stripHtml } from '@/utils/textHelpers';

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, getTotalItems } =
    useCartStore();

  const handleCheckout = () => {
    if (items.length === 0) return;

    // Формируем сообщение для WhatsApp
    let message = 'Здравствуйте! Интересуют следующие товары:\n\n';
    
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.product.name}\n`;
      message += `   Производитель: ${item.product.manufacturer}\n`;
      message += `   Количество: ${item.quantity} шт.\n\n`;
    });

    message += `\nОбщее количество позиций: ${getTotalItems()} шт.\n`;
    message += 'Пожалуйста, свяжитесь со мной для уточнения цены и деталей.';

    // Кодируем сообщение для URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappNumber = COMPANY_INFO.defaultWhatsApp.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    // Открываем WhatsApp
    window.open(whatsappUrl, '_blank');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-32 h-32 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center"
          >
            <ShoppingCart className="w-16 h-16 text-gray-400" />
          </motion.div>
          <h2 className="text-3xl font-bold mb-4">Список запросов пуст</h2>
          <p className="text-gray-600 mb-8">
            Добавьте товары из каталога для запроса цены
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white font-semibold rounded-full hover:shadow-lg transform hover:scale-105 transition-all"
          >
            <span>Перейти в каталог</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Список запросов</span>
          </h1>
          <p className="text-gray-600 text-lg">
            Товаров в списке: <span className="font-semibold">{getTotalItems()}</span>
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="card p-6 flex flex-col sm:flex-row gap-6"
                >
                  {/* Product Image */}
                  <div className="w-full sm:w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.product.images && item.product.images[0] ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        📦
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">
                      {item.product.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                      {stripHtml(item.product.description)}
                    </p>
                    <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm font-medium">
                      {item.product.manufacturer}
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                        className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                        className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="w-10 h-10 bg-red-50 hover:bg-red-100 text-red-500 rounded-full flex items-center justify-center transition-colors"
                      title="Удалить из списка"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Clear Cart Button */}
            <button
              onClick={clearCart}
              className="text-red-500 hover:text-red-600 font-medium transition-colors"
            >
              Очистить список
            </button>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h2 className="text-2xl font-bold mb-6">Итого</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center pb-4 border-b">
                  <span className="text-gray-600">Всего позиций:</span>
                  <span className="font-semibold text-lg">{items.length}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b">
                  <span className="text-gray-600">Количество товаров:</span>
                  <span className="font-semibold text-lg">
                    {getTotalItems()} шт.
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#FFE66D]/20 to-[#FFA07A]/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  <strong>💬 Уточнение цены:</strong> После отправки запроса наш менеджер свяжется с вами для уточнения цены и деталей.
                </p>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full py-4 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white font-semibold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all flex items-center justify-center space-x-2"
              >
                <span>Отправить запрос</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Нажимая кнопку, вы будете перенаправлены в WhatsApp
              </p>

              <div className="mt-6 pt-6 border-t">
                <Link
                  href="/catalog"
                  className="text-[#FF6B35] hover:underline font-medium flex items-center justify-center space-x-2"
                >
                  <span>← Продолжить покупки</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

