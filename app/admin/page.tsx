'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Download, Database, CheckCircle, XCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface ImportStats {
  totalFiles?: number;
  totalProducts?: number;
  totalCategories?: number;
  errors?: string[];
}

interface CurrentStats {
  imported: boolean;
  totalProducts: number;
  totalCategories: number;
  productsPath: string | null;
  categoriesPath: string | null;
}

export default function AdminPage() {
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [currentStats, setCurrentStats] = useState<CurrentStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Загрузка текущей статистики при монтировании
  useEffect(() => {
    fetchCurrentStats();
  }, []);

  const fetchCurrentStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch('/api/import');
      const data = await response.json();
      setCurrentStats(data);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportError(null);
    setImportStats(null);

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setImportStats(data.data);
        fetchCurrentStats(); // Обновляем статистику
      } else {
        setImportError(data.message || 'Ошибка импорта');
        if (data.errors && data.errors.length > 0) {
          setImportStats({ errors: data.errors });
        }
      }
    } catch (error) {
      setImportError('Критическая ошибка при импорте: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Панель администратора</span>
          </h1>
          <p className="text-gray-600 text-lg">
            Управление импортом каталога товаров (126к+ позиций)
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Import Section */}
          <div className="space-y-6">
            <div className="card p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Импорт каталога</h2>
                  <p className="text-sm text-gray-600">Загрузка товаров из CSV файлов</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">📋 Инструкция:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>CSV файлы уже в папке <code className="bg-blue-100 px-1 rounded">public/uploads/csv/</code></li>
                        <li>Найдено <strong>431 файл</strong> по категориям</li>
                        <li>Нажмите "Запустить импорт" ниже</li>
                        <li>Дождитесь завершения (может занять несколько минут)</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="w-full py-4 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white font-semibold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Импорт в процессе... (это может занять время)</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-5 h-5" />
                      <span>Запустить импорт каталога</span>
                    </>
                  )}
                </button>

                {isImporting && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      ⏳ Обрабатываем 431 CSV файл... Пожалуйста, не закрывайте страницу.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Import Results */}
            {importStats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <h3 className="text-xl font-bold">✅ Результаты импорта</h3>
                </div>

                <div className="space-y-3">
                  {importStats.totalFiles !== undefined && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Обработано файлов:</span>
                      <span className="font-semibold text-lg">{importStats.totalFiles}</span>
                    </div>
                  )}
                  {importStats.totalProducts !== undefined && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Импортировано товаров:</span>
                      <span className="font-semibold text-lg text-green-600">
                        {importStats.totalProducts.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {importStats.totalCategories !== undefined && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Найдено категорий:</span>
                      <span className="font-semibold text-lg">{importStats.totalCategories}</span>
                    </div>
                  )}
                  {importStats.errors && importStats.errors.length > 0 && (
                    <div className="mt-4">
                      <p className="text-red-600 font-medium mb-2">⚠️ Ошибки ({importStats.errors.length}):</p>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                        {importStats.errors.slice(0, 10).map((error, index) => (
                          <p key={index} className="text-sm text-red-700 mb-1">• {error}</p>
                        ))}
                        {importStats.errors.length > 10 && (
                          <p className="text-sm text-red-600 mt-2">... и еще {importStats.errors.length - 10} ошибок</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Import Error */}
            {importError && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6 bg-red-50 border-2 border-red-200"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <XCircle className="w-6 h-6 text-red-500" />
                  <h3 className="text-xl font-bold text-red-700">❌ Ошибка импорта</h3>
                </div>
                <p className="text-red-600">{importError}</p>
              </motion.div>
            )}
          </div>

          {/* Current Stats Section */}
          <div className="space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#4ECDC4] to-[#44A08D] rounded-full flex items-center justify-center">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Текущая статистика</h2>
                    <p className="text-sm text-gray-600">Данные в системе</p>
                  </div>
                </div>
                <button
                  onClick={fetchCurrentStats}
                  disabled={isLoadingStats}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Обновить"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoadingStats ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {currentStats ? (
                <div className="space-y-4">
                  <div className={`rounded-lg p-4 border ${
                    currentStats.imported 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                      : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      {currentStats.imported ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-600" />
                      )}
                      <span className={`font-medium ${
                        currentStats.imported ? 'text-green-800' : 'text-gray-800'
                      }`}>
                        {currentStats.imported ? '✅ Каталог загружен' : '⏳ Каталог не загружен'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-gray-600">Товаров в базе:</span>
                      <span className="text-2xl font-bold text-[#FF6B35]">
                        {currentStats.totalProducts.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-gray-600">Категорий:</span>
                      <span className="text-2xl font-bold text-[#F7931E]">
                        {currentStats.totalCategories}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Additional Info */}
            <div className="card p-6 bg-gradient-to-br from-[#FFE66D]/20 to-[#FFA07A]/20">
              <h3 className="font-bold text-lg mb-3">📋 Важная информация</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✅ Файлы CSV в кодировке UTF-8</li>
                <li>🖼️ Изображения загружаются по прямым ссылкам (CDN)</li>
                <li>💬 Цены не импортируются (запрос через WhatsApp +79389000059)</li>
                <li>🔄 Повторный импорт заменяет существующие данные</li>
                <li>⏱️ Импорт 126к товаров занимает ~2-5 минут</li>
                <li>📦 Пагинация: 24 товара на страницу</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CSV Structure Example */}
        <div className="mt-8 card p-6">
          <h3 className="text-xl font-bold mb-4">📄 Структура CSV файлов</h3>
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto">
            <pre className="text-xs font-mono">
{`Изображения,Название,Артикул,Бренд,Категория,Подкатегория,Описание,Мощность,Объем,Цвет...
https://cdn.entero.ru/img1.jpg;https://cdn.entero.ru/img2.jpg,Кофемашина X,ART-001,Brand,Кофеварки,Кофемашины,Описание,1800W,2L,Черный...`}
            </pre>
          </div>
          <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="font-medium text-blue-900 mb-1">🔹 Разделители:</p>
              <ul className="text-blue-800 space-y-1">
                <li>• CSV: запятая (,)</li>
                <li>• Изображения: точка с запятой (;)</li>
                <li>• Характеристики: точка с запятой (;)</li>
              </ul>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="font-medium text-purple-900 mb-1">📁 Организация файлов:</p>
              <ul className="text-purple-800 space-y-1">
                <li>• 7 основных категорий</li>
                <li>• 431 файл CSV</li>
                <li>• ~126,000 товаров</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
