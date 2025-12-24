'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingCart, MessageCircle, AlertTriangle } from 'lucide-react';
import { useCatalogStore } from '@/store/catalogStore';
import { useCartStore } from '@/store/cartStore';
import { Product, ProductCharacteristic } from '@/types';
import { COMPANY_INFO } from '@/constants/categories';
import { useTranslations } from '@/lib/i18n';
import { getProductName, getProductDescription, getTranslatedCharacteristic } from '@/lib/productTranslations';

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { products } = useCatalogStore();
  const { addItem } = useCartStore();
  const t = useTranslations();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!params.id) {
          setProduct(null);
          return;
        }

        const decodedId = decodeURIComponent(String(params.id));

        if (products.length === 0) {
          const response = await fetch('/data/products.json');
          if (response.ok) {
            const data = await response.json();
            useCatalogStore.getState().setProducts(data);
            const foundProduct = data.find((p: Product) => p.id === decodedId || p.id === params.id);
            setProduct(foundProduct || null);
          } else {
            setProduct(null);
          }
        } else {
          const foundProduct = products.find(p => p.id === decodedId || p.id === params.id);
          setProduct(foundProduct || null);
        }
      } catch (error) {
        console.error('Ошибка загрузки:', error);
        setProduct(null);
      }
    };

    loadData();
  }, [params.id, products]);

  // Разделяем характеристики на основные и габариты
  const { mainCharacteristics, dimensions } = useMemo(() => {
    if (!product?.characteristics) {
      return { mainCharacteristics: [], dimensions: [] };
    }

    const dimensionNames = ['ширина', 'глубина', 'высота', 'вес', 'габариты', 'размеры', 'width', 'depth', 'height', 'weight', 'dimensions', 'sizes'];
    const main: ProductCharacteristic[] = [];
    const dims: ProductCharacteristic[] = [];

    product.characteristics.forEach(char => {
      const nameLower = char.name.toLowerCase();
      const nameEnLower = char.name_en?.toLowerCase() || '';
      if (dimensionNames.some(dim => nameLower.includes(dim) || nameEnLower.includes(dim))) {
        dims.push(char);
      } else {
        main.push(char);
      }
    });

    return { mainCharacteristics: main, dimensions: dims };
  }, [product?.characteristics]);

  const handleAddToCart = () => {
    if (product) {
      addItem(product);
    }
  };

  const handleWhatsApp = () => {
    const productName = product ? getProductName(product) : '';
    const message = `${t('product.whatsappGreeting')}\n${t('product.interestedIn')}:\n${productName}\n${window.location.href}\n\n${t('product.pleaseContact')}`;
    const whatsappUrl = `https://wa.me/${COMPANY_INFO.defaultWhatsApp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">{t('product.notFound')}</h2>
          <button
            onClick={() => router.push('/catalog')}
            className="px-6 py-3 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white rounded-lg font-semibold hover:from-[#FF7A45] hover:to-[#FF8A55] transition-colors"
          >
            {t('product.backToCatalog')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingTop: '7.5rem' }}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <motion.button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-[#FF6B35] mb-8 transition-colors group"
          whileHover={{ x: -5 }}
        >
          <ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="font-medium">{t('product.backToCatalog')}</span>
        </motion.button>

        <div className="grid lg:grid-cols-2 gap-12 mb-12">
          {/* Images */}
          <div>
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="aspect-square bg-white rounded-lg overflow-hidden shadow-lg border border-gray-200 p-8 flex items-center justify-center relative"
              >
                {product.images && product.images[selectedImage] ? (
                  <img
                    src={product.images[selectedImage]}
                    alt={getProductName(product)}
                    className="max-w-full max-h-full w-auto h-auto object-contain pointer-events-none"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <span className="text-6xl">📦</span>
                  </div>
                )}
                
                {product.images && product.images.length > 1 && (
                  <>
                    <div
                      onClick={() => setSelectedImage((prev) => (prev === 0 ? product.images.length - 1 : prev - 1))}
                      className="absolute left-0 top-0 w-1/2 h-full cursor-pointer z-10"
                    />
                    <div
                      onClick={() => setSelectedImage((prev) => (prev === product.images.length - 1 ? 0 : prev + 1))}
                      className="absolute right-0 top-0 w-1/2 h-full cursor-pointer z-10"
                    />
                  </>
                )}
              </motion.div>
            </div>

            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-3 mt-6">
                {product.images.slice(0, 5).map((image, index) => (
                  <motion.button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? 'border-blue-600 scale-105 shadow-md'
                        : 'border-gray-200 hover:border-blue-400'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img
                      src={image}
                      alt={`${getProductName(product)} - ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-8">
            {/* Manufacturer Badge */}
            {product.manufacturer && product.manufacturer !== 'Не указан' && product.manufacturer.trim() !== '' && (
              <div>
                <span className="inline-block px-4 py-2 bg-gradient-to-r from-[#FF6B35]/10 to-[#F7931E]/10 text-[#FF6B35] rounded-md text-sm font-semibold border border-[#FF6B35]/20">
                  {product.manufacturer}
                </span>
              </div>
            )}

            {/* Title */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight"
            >
              {getProductName(product)}
            </motion.h1>

            {/* Description - 2-3 paragraphs */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-gray-700 leading-relaxed space-y-4"
            >
              {product.description ? (
                <div
                  className="[&_p]:mb-4 [&_p]:text-base [&_p]:leading-relaxed [&_p]:text-gray-700"
                  dangerouslySetInnerHTML={{ __html: getProductDescription(product) }}
                />
              ) : (
                <>
                  <p className="text-base leading-relaxed">
                    Профессиональное оборудование для ресторанов, баров и предприятий общественного питания. 
                    Обеспечивает высокую производительность и надежность в эксплуатации.
                  </p>
                  <p className="text-base leading-relaxed">
                    Конструкция выполнена из качественных материалов, обеспечивающих долговечность и простоту обслуживания. 
                    Подходит для интенсивного использования в условиях высокой проходимости.
                  </p>
                  <p className="text-base leading-relaxed">
                    Экономичное энергопотребление и современные технологии делают это оборудование оптимальным выбором 
                    для профессиональных заведений.
                  </p>
                </>
              )}
            </motion.div>

            {/* Action Buttons - Desktop */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="hidden md:grid grid-cols-2 gap-4"
            >
              <motion.button
                onClick={handleAddToCart}
                className="flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-[#FF6B35] via-[#FF7A45] to-[#F7931E] text-white rounded-lg font-semibold text-base shadow-md hover:shadow-lg hover:from-[#FF7A45] hover:to-[#FF8A55] transition-all group"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>{t('product.addToRequest')}</span>
              </motion.button>

              <motion.button
                onClick={handleWhatsApp}
                className="flex items-center justify-center space-x-3 px-6 py-4 bg-green-600 text-white rounded-lg font-semibold text-base shadow-md hover:shadow-lg hover:bg-green-700 transition-all group"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>{t('product.contactWhatsApp')}</span>
              </motion.button>
            </motion.div>
          </div>
        </div>

        {/* Main Characteristics Table */}
        {mainCharacteristics.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg shadow-md border border-gray-200 p-6 md:p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('product.mainCharacteristics')}</h2>
            
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <tbody className="divide-y divide-gray-200">
                  {mainCharacteristics.map((char, index) => {
                    const translatedChar = getTranslatedCharacteristic(char);
                    return (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4 font-semibold text-gray-700 w-1/2">
                          {translatedChar.name}
                        </td>
                        <td className="py-4 px-4 text-gray-900 font-medium">
                          {translatedChar.value}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {mainCharacteristics.map((char, index) => {
                const translatedChar = getTranslatedCharacteristic(char);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="font-semibold text-gray-700 mb-2">{translatedChar.name}</div>
                    <div className="text-gray-900 font-medium">{translatedChar.value}</div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Dimensions Table */}
        {dimensions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-lg shadow-md border border-gray-200 p-6 md:p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('product.dimensions')}</h2>
            
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <tbody className="divide-y divide-gray-200">
                  {dimensions.map((char, index) => {
                    const translatedChar = getTranslatedCharacteristic(char);
                    return (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4 font-semibold text-gray-700 w-1/2">
                          {translatedChar.name}
                        </td>
                        <td className="py-4 px-4 text-gray-900 font-medium">
                          {translatedChar.value}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {dimensions.map((char, index) => {
                const translatedChar = getTranslatedCharacteristic(char);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="font-semibold text-gray-700 mb-2">{translatedChar.name}</div>
                    <div className="text-gray-900 font-medium">{translatedChar.value}</div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Warning Notice */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-lg mb-8"
        >
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800 leading-relaxed">
                <strong>{t('product.warning')}</strong> {t('product.warningDescription')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons - Mobile Sticky */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl p-4 z-50 grid grid-cols-2 gap-3 safe-area-bottom"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          <motion.button
            onClick={handleAddToCart}
            className="flex items-center justify-center space-x-2 px-4 py-3.5 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white rounded-lg font-semibold text-sm shadow-md hover:from-[#FF7A45] hover:to-[#FF8A55] transition-all active:from-[#FF5A25] active:to-[#F7830E]"
            whileTap={{ scale: 0.95 }}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>{t('product.addToCart')}</span>
          </motion.button>

          <motion.button
            onClick={handleWhatsApp}
            className="flex items-center justify-center space-x-2 px-4 py-3.5 bg-green-600 text-white rounded-lg font-semibold text-sm shadow-md hover:bg-green-700 transition-all active:bg-green-800"
            whileTap={{ scale: 0.95 }}
          >
            <MessageCircle className="w-5 h-5" />
            <span>WhatsApp</span>
          </motion.button>
        </motion.div>
        
        {/* Spacer for mobile sticky buttons */}
        <div className="md:hidden h-24" />
      </div>
    </div>
  );
}
