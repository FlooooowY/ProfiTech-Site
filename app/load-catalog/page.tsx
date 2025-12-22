'use client';

import { useEffect, useState } from 'react';
import { useCatalogStore } from '@/store/catalogStore';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export default function LoadCatalogPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [stats, setStats] = useState({ products: 0, categories: 0 });
  const { setProducts } = useCatalogStore();
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      try {
        setStatus('loading');
        
        // Загружаем products.json
        const productsRes = await fetch('/data/products.json');
        
        if (!productsRes.ok) {
          throw new Error('Файл products.json не найден. Запустите импорт сначала!');
        }

        const productsData = await productsRes.json();
        
        setProducts(productsData);
        setStats({
          products: productsData.length,
          categories: new Set(productsData.map((p: { categoryId: string }) => p.categoryId)).size,
        });
        
        setStatus('success');
        
        // Автоматически перенаправляем в каталог через 2 секунды
        setTimeout(() => {
          router.push('/catalog');
        }, 2000);
        
      } catch (error) {
        console.error('Ошибка загрузки:', error);
        setStatus('error');
      }
    };

    loadData();
  }, [setProducts, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card p-12 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-[#FF6B35] animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Загрузка каталога...</h2>
            <p className="text-gray-600">Пожалуйста, подождите</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Каталог загружен!</h2>
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <p className="text-green-800">
                <strong>{stats.products.toLocaleString()}</strong> товаров
              </p>
              <p className="text-green-800">
                <strong>{stats.categories}</strong> категорий
              </p>
            </div>
            <p className="text-gray-600 mb-4">
              Перенаправление в каталог...
            </p>
            <button
              onClick={() => router.push('/catalog')}
              className="px-6 py-3 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white font-semibold rounded-lg hover:shadow-lg transition-all inline-flex items-center space-x-2"
            >
              <span>Перейти в каталог</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Ошибка загрузки</h2>
            <div className="bg-red-50 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">
                Данные не найдены. Сначала запустите импорт каталога из админ-панели.
              </p>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="px-6 py-3 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white font-semibold rounded-lg hover:shadow-lg transition-all"
            >
              Перейти в админ-панель
            </button>
          </>
        )}
      </div>
    </div>
  );
}

