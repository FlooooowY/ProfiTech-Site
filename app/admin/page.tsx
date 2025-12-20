'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Settings,
  Save,
  Loader2,
} from 'lucide-react';
import Papa from 'papaparse';
import { useCatalogStore } from '@/store/catalogStore';
import { Product } from '@/types';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'carousel' | 'settings'>(
    'catalog'
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [whatsappNumber, setWhatsappNumber] = useState('+79000000000');
  
  const { setProducts } = useCatalogStore();

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('Обработка файла...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const products: Product[] = results.data.map((row: any, index: number) => {
            // Парсим характеристики из CSV
            const characteristics = [];
            for (const key in row) {
              if (
                key.startsWith('char_') &&
                row[key] &&
                row[key].trim() !== ''
              ) {
                const charName = key.replace('char_', '').replace(/_/g, ' ');
                characteristics.push({
                  name: charName,
                  value: row[key],
                });
              }
            }

            // Парсим изображения (разделенные запятой)
            const images = row.images
              ? row.images.split(',').map((img: string) => img.trim())
              : [];

            return {
              id: row.id || `product-${index + 1}`,
              name: row.name || 'Без названия',
              description: row.description || '',
              categoryId: row.categoryId || '1',
              subcategoryId: row.subcategoryId || '',
              manufacturer: row.manufacturer || 'Не указан',
              characteristics,
              images,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          });

          setProducts(products);
          setUploadStatus(`Успешно загружено ${products.length} товаров!`);
          
          setTimeout(() => {
            setUploadStatus('');
          }, 3000);
        } catch (error) {
          setUploadStatus('Ошибка при обработке файла. Проверьте формат CSV.');
        } finally {
          setIsUploading(false);
        }
      },
      error: (error) => {
        setUploadStatus(`Ошибка: ${error.message}`);
        setIsUploading(false);
      },
    });
  };

  const handleSaveSettings = () => {
    // В реальном приложении здесь был бы запрос к API
    setUploadStatus('Настройки сохранены!');
    setTimeout(() => setUploadStatus(''), 3000);
  };

  const tabs = [
    { id: 'catalog', label: 'Каталог', icon: FileText },
    { id: 'carousel', label: 'Карусель', icon: ImageIcon },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Панель администратора</span>
          </h1>
          <p className="text-gray-600 text-lg">
            Управление контентом и настройками сайта
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Status Message */}
        {uploadStatus && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg ${
              uploadStatus.includes('Ошибка')
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}
          >
            {uploadStatus}
          </motion.div>
        )}

        {/* Content */}
        <div className="card p-8">
          {activeTab === 'catalog' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Загрузка каталога</h2>
              
              <div className="mb-8">
                <h3 className="font-semibold mb-3">Формат CSV файла:</h3>
                <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                  <p className="mb-2">
                    id,name,description,categoryId,subcategoryId,manufacturer,images,char_мощность,char_объем,...
                  </p>
                  <p className="text-gray-600">
                    1,"Кофемашина X100","Описание","2","2-2","Brand","img1.jpg,img2.jpg","1200W","2L"
                  </p>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  * Характеристики добавляются с префиксом "char_"
                  <br />* Изображения разделяются запятой
                  <br />* categoryId и subcategoryId должны соответствовать ID из системы
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-[#FF6B35] transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                  id="csv-upload"
                  disabled={isUploading}
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  {isUploading ? (
                    <Loader2 className="w-16 h-16 text-[#FF6B35] animate-spin mb-4" />
                  ) : (
                    <Upload className="w-16 h-16 text-gray-400 mb-4" />
                  )}
                  <p className="text-lg font-medium mb-2">
                    {isUploading
                      ? 'Загрузка...'
                      : 'Нажмите для загрузки CSV файла'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Поддерживаются файлы формата CSV
                  </p>
                </label>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Совет:</strong> Подготовьте CSV файл с вашим каталогом
                  и поместите его в папку <code className="bg-white px-2 py-1 rounded">public/uploads/csv/</code>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'carousel' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Управление каруселью</h2>
              
              <div className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-[#FF6B35] transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    id="carousel-upload"
                  />
                  <label
                    htmlFor="carousel-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <ImageIcon className="w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-lg font-medium mb-2">
                      Нажмите для загрузки изображений
                    </p>
                    <p className="text-sm text-gray-500">
                      Поддерживаются форматы: JPG, PNG, WebP
                    </p>
                  </label>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Инструкция:</strong> Загрузите изображения в папку{' '}
                    <code className="bg-white px-2 py-1 rounded">
                      public/uploads/carousel/
                    </code>
                    . Рекомендуемый размер: 1920x1080px
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Настройки сайта</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Логотип компании
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#FF6B35] transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-sm font-medium">Загрузить логотип</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Форматы: PNG, SVG (рекомендуется прозрачный фон)
                      </p>
                    </label>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Разместите логотип в папке{' '}
                    <code className="bg-gray-100 px-2 py-1 rounded">
                      public/uploads/logo/
                    </code>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Номер WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+79000000000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Формат: +7XXXXXXXXXX (без пробелов)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email для связи
                  </label>
                  <input
                    type="email"
                    defaultValue="info@profitech.ru"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Адрес компании
                  </label>
                  <textarea
                    defaultValue="Москва, Россия"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                  />
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  <Save className="w-5 h-5" />
                  <span>Сохранить настройки</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

