'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface FilterSidebarProps {
  children: ReactNode;
  headerHeight?: number; // Высота шапки в пикселях
  className?: string;
}

export default function FilterSidebar({ 
  children, 
  headerHeight = 96, // По умолчанию 96px (6rem)
  className = ''
}: FilterSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateMaxHeight = () => {
      if (!sidebarRef.current) return;

      const footer = document.querySelector('footer');
      
      if (!footer) {
        sidebarRef.current.style.maxHeight = 'calc(100vh - 8rem)';
        return;
      }

      const footerRect = footer.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Вычисляем максимальную высоту плашки так, чтобы её нижний край не заходил на подвал
      // maxHeight = расстояние от верха плашки до верха подвала - отступ
      const footerTop = footerRect.top;
      const maxHeight = footerTop - headerHeight - 20; // 20px отступ безопасности
      
      // Устанавливаем максимальную высоту
      if (maxHeight > 0) {
        sidebarRef.current.style.maxHeight = `${maxHeight}px`;
      } else {
        sidebarRef.current.style.maxHeight = 'calc(100vh - 8rem)';
      }
    };

    const handleScroll = () => {
      updateMaxHeight();
    };

    const handleResize = () => {
      updateMaxHeight();
    };

    // Вызываем сразу
    updateMaxHeight();

    // Подписываемся на события
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // Используем IntersectionObserver для отслеживания подвала
    const footer = document.querySelector('footer');
    if (footer) {
      const observer = new IntersectionObserver(
        () => {
          updateMaxHeight();
        },
        {
          root: null,
          rootMargin: '0px',
          threshold: [0, 0.1, 0.5, 1]
        }
      );

      observer.observe(footer);

      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
        observer.disconnect();
      };
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [headerHeight]);

  return (
    <aside
      ref={sidebarRef}
      className={`hidden lg:block lg:fixed lg:left-4 lg:w-80 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto custom-scrollbar lg:z-10 bg-white rounded-2xl shadow-lg border border-gray-400 transition-all duration-300 ${className}`}
      style={{
        top: `${headerHeight}px`
      }}
    >
      {children}
    </aside>
  );
}

