'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingCart, Share2, Heart, Phone } from 'lucide-react';
import { useCatalogStore } from '@/store/catalogStore';
import { useCartStore } from '@/store/cartStore';
import { Product } from '@/types';
import { COMPANY_INFO } from '@/constants/categories';

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { products } = useCatalogStore();
  const { addItem } = useCartStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!params.id) {
          setProduct(null);
          return;
        }

        // Декодируем ID из URL
        const decodedId = decodeURIComponent(String(params.id));

        // Всегда загружаем данные если их нет в store
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
          // Если данные уже есть, просто ищем продукт
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

  const handleAddToCart = () => {
    if (product) {
      addItem(product);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: product?.description,
        url: window.location.href,
      });
    }
  };

  const handleWhatsApp = () => {
    const message = `Здравствуйте! Интересует товар:\n${product?.name}\n${window.location.href}\n\nПожалуйста, сообщите цену и наличие.`;
    const whatsappUrl = `https://wa.me/${COMPANY_INFO.defaultWhatsApp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Товар не найден</h2>
          <button
            onClick={() => router.push('/catalog')}
            className="px-6 py-3 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white rounded-lg font-semibold"
          >
            Вернуться в каталог
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-[#FF6B35] mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Назад к каталогу</span>
        </button>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="aspect-square bg-white rounded-lg overflow-hidden shadow-lg"
            >
              {product.images && product.images[selectedImage] ? (
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <span className="text-9xl">📦</span>
                </div>
              )}
            </motion.div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.slice(0, 5).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? 'border-[#FF6B35] scale-105'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} - ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-4">
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                {product.manufacturer}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-6">{product.name}</h1>

            {/* Price Block */}
            <div className="mb-8 p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border-2 border-orange-200">
              <p className="text-lg font-semibold text-orange-900 mb-2">
                💬 Цена по запросу
              </p>
              <p className="text-sm text-orange-700">
                Свяжитесь с нами для уточнения актуальной цены и наличия
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={handleAddToCart}
                className="flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>В запрос</span>
              </button>

              <button
                onClick={handleWhatsApp}
                className="flex items-center justify-center space-x-2 px-6 py-4 bg-green-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
              >
                <Phone className="w-5 h-5" />
                <span>WhatsApp</span>
              </button>
            </div>

            <div className="flex space-x-2 mb-8">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  isFavorite
                    ? 'border-red-500 bg-red-50 text-red-600'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                <span>В избранное</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-all"
              >
                <Share2 className="w-5 h-5" />
                <span>Поделиться</span>
              </button>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Описание</h2>
              <div
                className="prose prose-sm max-w-none text-gray-700 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-3 [&_li]:mb-1 [&_b]:font-semibold [&_strong]:font-semibold [&_a]:text-[#FF6B35] [&_a]:no-underline"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>

            {/* Characteristics */}
            {product.characteristics && product.characteristics.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Характеристики</h2>
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {product.characteristics.map((char, index) => (
                    <div
                      key={index}
                      className={`flex justify-between items-start py-3 px-4 ${
                        index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                      }`}
                    >
                      <span className="text-gray-600 font-medium">{char.name}</span>
                      <span className="text-gray-900 font-semibold text-right ml-4">
                        {char.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

