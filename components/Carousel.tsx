'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CarouselImage } from '@/types';

interface CarouselProps {
  images: CarouselImage[];
  autoPlayInterval?: number;
}

export default function Carousel({ images, autoPlayInterval = 5000 }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const handleNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!images || images.length === 0) return;

    const timer = setInterval(() => {
      handleNext();
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [images, autoPlayInterval, handleNext]);

  const handleDotClick = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  if (!images || images.length === 0) {
    return (
      <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] bg-gradient-to-br from-[#FF6B35] via-[#F7931E] to-[#FF8C42] flex items-center justify-center rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="text-center text-white z-10 px-4">
          <p className="text-xl md:text-2xl lg:text-3xl mb-8 animate-fade-in opacity-90">От идеи до воплощения</p>
          <Link
            href="/catalog"
            className="inline-block px-8 py-4 bg-white text-[#FF6B35] font-semibold rounded-full hover:shadow-2xl transform hover:scale-105 transition-all"
          >
            Смотреть каталог
          </Link>
        </div>
      </div>
    );
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <div className="carousel-container relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden bg-white rounded-2xl">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="absolute inset-0"
        >
          {/* Gradient Background - разные для каждого слайда */}
          <div 
            className={`absolute inset-0 ${
              currentIndex === 0 
                ? 'bg-gradient-to-br from-[#FF6B35] via-[#F7931E] to-[#FF8C42]'
                : currentIndex === 1
                ? 'bg-gradient-to-br from-[#4ECDC4] via-[#44A08D] to-[#06D6A0]'
                : 'bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb]'
            }`}
          />
          
          {/* Декоративные элементы */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          </div>
          
          {/* Image - убрано, чтобы не показывать фоновый текст ProfiTech */}
          
          {/* Overlay with text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent flex items-center justify-center">
            <div className="container mx-auto px-4 text-center">
              {images[currentIndex].title && (
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="carousel-text text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white"
                  style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}
                >
                  {images[currentIndex].title}
                </motion.h2>
              )}
              {images[currentIndex].description && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="carousel-text text-xl md:text-2xl lg:text-3xl max-w-3xl mx-auto mb-8 text-white"
                  style={{ color: '#ffffff', textShadow: '0 1px 3px rgba(0, 0, 0, 0.2)' }}
                >
                  {images[currentIndex].description}
                </motion.p>
              )}
              {images[currentIndex].link && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Link
                    href={images[currentIndex].link}
                    className={`inline-block px-10 py-4 font-bold text-lg rounded-full hover:shadow-2xl transform hover:scale-105 transition-all ${
                      currentIndex === 0
                        ? 'bg-white text-[#FF6B35]'
                        : currentIndex === 1
                        ? 'bg-white text-[#4ECDC4]'
                        : 'bg-white text-[#667eea]'
                    }`}
                  >
                    Подробнее →
                  </Link>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full flex items-center justify-center transition-all group z-10"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full flex items-center justify-center transition-all group z-10"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`transition-all ${
              index === currentIndex
                ? 'w-8 h-2 bg-white'
                : 'w-2 h-2 bg-white/50 hover:bg-white/70'
            } rounded-full`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

