'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Package, Zap, HeadphonesIcon, Shield } from 'lucide-react';
import Carousel from '@/components/Carousel';
import { CATEGORIES } from '@/constants/categories';
import { CarouselImage } from '@/types';

// Изображения для карусели
const carouselImages: CarouselImage[] = [
  {
    id: '1',
    url: '/uploads/carousel/slide1.svg',
    alt: 'Профессиональное оборудование ProfiTech',
    title: 'Оборудование для вашего бизнеса',
    description: 'Широкий выбор профессионального оборудования для любых задач',
    link: '/catalog',
  },
];

const features = [
  {
    icon: Package,
    title: 'Широкий ассортимент',
    description: 'Более 10,000 позиций профессионального оборудования',
  },
  {
    icon: Shield,
    title: 'Гарантия качества',
    description: 'Работаем только с проверенными производителями',
  },
  {
    icon: Zap,
    title: 'Быстрая доставка',
    description: 'Оперативная доставка по всей России',
  },
  {
    icon: HeadphonesIcon,
    title: 'Поддержка 24/7',
    description: 'Всегда на связи для решения ваших вопросов',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section with Carousel */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        <Carousel images={carouselImages} />
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Почему выбирают <span className="gradient-text">ProfiTech</span>
            </h2>
            <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto">
              Мы предлагаем комплексные решения для вашего бизнеса
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card p-8 text-center group hover:shadow-2xl cursor-pointer"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <feature.icon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Наши <span className="gradient-text">категории</span>
            </h2>
            <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto">
              Найдите именно то, что нужно для вашего бизнеса
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {CATEGORIES.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={`/catalog?category=${category.slug}`}
                  className="card p-8 md:p-10 block group hover:shadow-2xl transition-all duration-300 h-full"
                >
                  <div className="flex items-start space-x-6 mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-3xl flex items-center justify-center text-4xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg flex-shrink-0">
                      {category.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-bold group-hover:text-[#FF6B35] transition-colors mb-2">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">
                        {category.subcategories?.length} подкатегорий
                      </p>
                    </div>
                    <ArrowRight className="w-7 h-7 text-gray-400 group-hover:text-[#FF6B35] group-hover:translate-x-2 transition-all duration-300 flex-shrink-0" />
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {category.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {category.subcategories?.slice(0, 3).map((sub) => (
                      <span
                        key={sub.id}
                        className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full text-sm text-gray-700 font-medium hover:from-[#FFE66D]/20 hover:to-[#FFA07A]/20 transition-all"
                      >
                        {sub.name}
                      </span>
                    ))}
                    {category.subcategories && category.subcategories.length > 3 && (
                      <span className="px-4 py-2 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white rounded-full text-sm font-bold">
                        +{category.subcategories.length - 3} ещё
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link
              href="/catalog"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white font-semibold rounded-full hover:shadow-lg transform hover:scale-105 transition-all"
            >
              <span>Смотреть весь каталог</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-r from-[#FF6B35] via-[#F7931E] to-[#FF8C42] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 text-center text-white relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8">
              Готовы начать?
            </h2>
            <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto opacity-95 leading-relaxed">
              Свяжитесь с нами прямо сейчас и получите индивидуальное
              коммерческое предложение
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                href="/catalog"
                className="px-10 py-5 bg-white text-[#FF6B35] font-bold text-lg rounded-full hover:shadow-2xl transform hover:scale-105 transition-all"
              >
                Перейти в каталог
              </Link>
              <a
                href="https://wa.me/79000000000"
                target="_blank"
                rel="noopener noreferrer"
                className="px-10 py-5 bg-white/20 backdrop-blur-sm border-2 border-white text-white font-bold text-lg rounded-full hover:bg-white/30 transition-all"
              >
                Написать в WhatsApp
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
