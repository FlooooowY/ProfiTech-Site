'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Package, Zap, HeadphonesIcon, Shield } from 'lucide-react';
import Carousel from '@/components/Carousel';
import { CATEGORIES } from '@/constants/categories';
import { CarouselImage } from '@/types';
import { useTranslations } from '@/lib/i18n';
import { COMPANY_INFO } from '@/constants/categories';

// Изображения для карусели будут созданы динамически с переводами


export default function HomePage() {
  const t = useTranslations();
  
  // Изображения для карусели с переводами
  const carouselImages: CarouselImage[] = [
    {
      id: '1',
      url: '/uploads/carousel/slide1.svg',
      alt: t('home.title'),
      title: t('home.title'),
      description: t('home.carousel1'),
      link: '/catalog',
    },
    {
      id: '2',
      url: '/uploads/carousel/slide1.svg',
      alt: t('home.carousel2Title'),
      title: t('home.carousel2Title'),
      description: t('home.carousel2Desc'),
      link: '/catalog?category=kofevarki-i-kofemashini',
    },
    {
      id: '3',
      url: '/uploads/carousel/slide1.svg',
      alt: t('home.carousel3Title'),
      title: t('home.carousel3Title'),
      description: t('home.carousel3Desc'),
      link: '/catalog?category=profoborudovanie',
    },
  ];
  
  const features = [
    {
      icon: Package,
      title: t('home.wideRange'),
      description: t('home.wideRangeDesc'),
    },
    {
      icon: Shield,
      title: t('home.quality'),
      description: t('home.qualityDesc'),
    },
    {
      icon: Zap,
      title: t('home.fastDelivery'),
      description: t('home.fastDeliveryDesc'),
    },
    {
      icon: HeadphonesIcon,
      title: t('home.support'),
      description: t('home.supportDesc'),
    },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-white">
      {/* Hero Section with Carousel */}
      <section className="container mx-auto px-4" style={{ marginBottom: '40px', paddingLeft: '32px', paddingRight: '32px', paddingTop: '64px', paddingBottom: '20px' }}>
        <Carousel images={carouselImages} />
      </section>

      {/* Features Section */}
      <section className="bg-gradient-to-br from-gray-50 via-white to-gray-50" style={{ paddingTop: '40px', paddingBottom: '80px', marginTop: '40px', marginBottom: '40px', paddingLeft: '32px', paddingRight: '32px' }}>
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
            style={{ marginBottom: '80px' }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold" style={{ color: '#000000', marginBottom: '32px' }}>
              <span style={{ color: '#000000' }}>{t('home.whyChoose')}</span> <span className="gradient-text">ProfiTech</span>
            </h2>
            <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto font-semibold">
              {t('home.whyChooseSubtitle')}
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
                className="card p-10 text-center group hover:shadow-2xl cursor-pointer flex flex-col"
                style={{ minHeight: '280px' }}
              >
                <div className="flex-shrink-0" style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '20px', marginBottom: '32px' }}>
                  <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-lg">
                    <feature.icon className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#000000' }}>{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed font-semibold">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="bg-white" style={{ paddingTop: '40px', paddingBottom: '100px', marginTop: '40px', marginBottom: '40px', paddingLeft: '32px', paddingRight: '32px' }}>
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
            style={{ marginBottom: '60px' }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold" style={{ marginBottom: '16px' }}>
              <span style={{ color: '#FF6B35' }}>{t('home.ourCategories')}</span> <span className="gradient-text">{t('home.categories')}</span>
            </h2>
            <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto font-semibold">
              {t('home.categoriesSubtitle')}
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
                  className="card block group hover:shadow-2xl transition-all duration-300 h-full"
                  style={{ padding: '32px' }}
                >
                  <div className="flex items-start mb-6" style={{ gap: '32px' }}>
                    <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-3xl flex items-center justify-center text-4xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg flex-shrink-0">
                      {category.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-bold text-gray-950 group-hover:text-[#FF6B35] transition-colors mb-2">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-600 font-semibold">
                        {category.subcategories?.length} {t('home.subcategories')}
                      </p>
                    </div>
                    <ArrowRight className="w-7 h-7 text-gray-900 group-hover:text-[#FF6B35] group-hover:translate-x-2 transition-all duration-300 flex-shrink-0" />
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed font-semibold">
                    {category.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {category.subcategories?.slice(0, 3).map((sub) => (
                      <span
                        key={sub.id}
                        className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full text-sm text-gray-900 font-medium hover:from-[#FFE66D]/20 hover:to-[#FFA07A]/20 transition-all"
                      >
                        {sub.name}
                      </span>
                    ))}
                    {category.subcategories && category.subcategories.length > 3 && (
                      <span className="px-4 py-2 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white rounded-full text-sm font-bold">
                        +{category.subcategories.length - 3} {t('home.more')}
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
            className="text-center mt-16 md:mt-20"
          >
            <Link
              href="/catalog"
              className="inline-flex items-center space-x-2 text-[#FF6B35] font-semibold rounded-full hover:shadow-lg transform hover:scale-105 transition-all"
              style={{ padding: '16px 32px' }}
            >
              <span>{t('home.viewCatalog')}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#FF6B35] via-[#F7931E] to-[#FF8C42] relative overflow-hidden" style={{ paddingTop: '80px', paddingBottom: '120px', marginTop: '40px', marginBottom: '0', paddingLeft: '32px', paddingRight: '32px' }}>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 text-center text-white relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white" style={{ marginBottom: '40px', color: '#ffffff' }}>
              {t('home.readyToStart')}
            </h2>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto opacity-95 leading-relaxed" style={{ marginBottom: '48px' }}>
              {t('home.readyToStartDesc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                href="/catalog"
                className="bg-white text-[#FF6B35] font-bold text-lg rounded-full hover:shadow-2xl transform hover:scale-105 transition-all"
                style={{ padding: '20px 40px' }}
              >
                {t('home.goToCatalog')}
              </Link>
              <a
                href={`https://wa.me/${COMPANY_INFO.defaultWhatsApp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/20 backdrop-blur-sm border-2 border-white text-white font-bold text-lg rounded-full hover:bg-white/30 transition-all"
                style={{ padding: '20px 40px' }}
              >
                {t('home.writeWhatsApp')}
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
