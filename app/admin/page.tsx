'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Database, CheckCircle, XCircle, Loader2, AlertCircle, RefreshCw, Package, FolderOpen, TrendingUp, FileText } from 'lucide-react';

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
        fetchCurrentStats();
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50" style={{ paddingTop: '7.5rem' }}>
      <div className="container mx-auto px-4 py-8" style={{ paddingLeft: '32px', paddingRight: '32px', maxWidth: '1400px' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-2xl flex items-center justify-center shadow-lg">
              <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                Панель администратора
              </h1>
              <p className="text-gray-600 text-lg mt-2">
                Управление импортом каталога товаров
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Import Section */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-[#FF6B35] to-[#F7931E] p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Upload className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Импорт каталога</h2>
                    <p className="text-white/90 text-sm">Загрузка товаров из CSV файлов</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-5">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-900">
                      <p className="font-bold mb-2 text-base">📋 Инструкция по импорту:</p>
                      <ol className="list-decimal list-inside space-y-2 text-blue-800">
                        <li>CSV файлы находятся в папке <code className="bg-blue-100 px-2 py-1 rounded font-mono text-xs">public/uploads/csv/</code></li>
                        <li>Найдено <strong className="text-blue-900">431 файл</strong> по категориям</li>
                        <li>Нажмите кнопку &quot;Запустить импорт&quot; ниже</li>
                        <li>Дождитесь завершения процесса (может занять несколько минут)</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <motion.button
                  onClick={handleImport}
                  disabled={isImporting}
                  whileHover={{ scale: isImporting ? 1 : 1.02, y: isImporting ? 0 : -2 }}
                  whileTap={{ scale: isImporting ? 1 : 0.98 }}
                  className="w-full py-4 bg-gradient-to-r from-[#FF6B35] via-[#FF7A45] to-[#F7931E] text-white font-bold rounded-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 text-lg"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Импорт в процессе...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-6 h-6" />
                      <span>Запустить импорт каталога</span>
                    </>
                  )}
                </motion.button>

                {isImporting && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4"
                  >
                    <div className="flex items-center space-x-3">
                      <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                      <p className="text-sm text-amber-800 font-medium">
                        ⏳ Обрабатываем 431 CSV файл... Пожалуйста, не закрывайте страницу.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Import Results */}
            {importStats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl border-2 border-green-200 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-7 h-7 text-white" />
                    <h3 className="text-2xl font-bold text-white">✅ Результаты импорта</h3>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {importStats.totalFiles !== undefined && (
                    <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-2">
                        <FolderOpen className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-700 font-medium">Обработано файлов:</span>
                      </div>
                      <span className="font-bold text-xl text-gray-900">{importStats.totalFiles}</span>
                    </div>
                  )}
                  {importStats.totalProducts !== undefined && (
                    <div className="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                      <div className="flex items-center space-x-2">
                        <Package className="w-5 h-5 text-green-600" />
                        <span className="text-gray-700 font-medium">Импортировано товаров:</span>
                      </div>
                      <span className="font-bold text-2xl text-green-600">
                        {importStats.totalProducts.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {importStats.totalCategories !== undefined && (
                    <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-700 font-medium">Найдено категорий:</span>
                      </div>
                      <span className="font-bold text-xl text-[#FF6B35]">{importStats.totalCategories}</span>
                    </div>
                  )}
                  {importStats.errors && importStats.errors.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <p className="text-red-600 font-bold">⚠️ Ошибки ({importStats.errors.length}):</p>
                      </div>
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 max-h-48 overflow-y-auto">
                        {importStats.errors.slice(0, 10).map((error, index) => (
                          <p key={index} className="text-sm text-red-700 mb-2 flex items-start">
                            <span className="mr-2">•</span>
                            <span>{error}</span>
                          </p>
                        ))}
                        {importStats.errors.length > 10 && (
                          <p className="text-sm text-red-600 mt-3 font-medium">
                            ... и еще {importStats.errors.length - 10} ошибок
                          </p>
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
                className="bg-white rounded-2xl shadow-xl border-2 border-red-300 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-red-500 to-rose-500 p-6">
                  <div className="flex items-center space-x-3">
                    <XCircle className="w-7 h-7 text-white" />
                    <h3 className="text-2xl font-bold text-white">❌ Ошибка импорта</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-red-600 font-medium">{importError}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Current Stats Section */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-cyan-500 to-teal-500 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Database className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Текущая статистика</h2>
                      <p className="text-white/90 text-sm">Данные в системе</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={fetchCurrentStats}
                    disabled={isLoadingStats}
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-colors"
                    title="Обновить"
                  >
                    <RefreshCw className={`w-5 h-5 text-white ${isLoadingStats ? 'animate-spin' : ''}`} />
                  </motion.button>
                </div>
              </div>

              <div className="p-6">
                {currentStats ? (
                  <div className="space-y-4">
                    <div className={`rounded-xl p-5 border-2 ${
                      currentStats.imported 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                        : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300'
                    }`}>
                      <div className="flex items-center space-x-3">
                        {currentStats.imported ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <AlertCircle className="w-6 h-6 text-gray-600" />
                        )}
                        <span className={`font-bold text-lg ${
                          currentStats.imported ? 'text-green-800' : 'text-gray-800'
                        }`}>
                          {currentStats.imported ? '✅ Каталог загружен' : '⏳ Каталог не загружен'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-4 px-5 bg-gradient-to-r from-[#FF6B35]/10 to-[#F7931E]/10 rounded-xl border-2 border-[#FF6B35]/20">
                        <div className="flex items-center space-x-3">
                          <Package className="w-6 h-6 text-[#FF6B35]" />
                          <span className="text-gray-700 font-semibold">Товаров в базе:</span>
                        </div>
                        <span className="text-3xl font-bold text-[#FF6B35]">
                          {currentStats.totalProducts.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-4 px-5 bg-gradient-to-r from-[#F7931E]/10 to-[#FF6B35]/10 rounded-xl border-2 border-[#F7931E]/20">
                        <div className="flex items-center space-x-3">
                          <TrendingUp className="w-6 h-6 text-[#F7931E]" />
                          <span className="text-gray-700 font-semibold">Категорий:</span>
                        </div>
                        <span className="text-3xl font-bold text-[#F7931E]">
                          {currentStats.totalCategories}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Additional Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-2xl shadow-xl border-2 border-amber-200 p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <FileText className="w-6 h-6 text-amber-600" />
                <h3 className="font-bold text-xl text-gray-900">📋 Важная информация</h3>
              </div>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Файлы CSV в кодировке UTF-8</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Изображения загружаются по прямым ссылкам (CDN)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Цены не импортируются (запрос через WhatsApp)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Повторный импорт заменяет существующие данные</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Импорт 126к товаров занимает ~2-5 минут</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Пагинация: 24 товара на страницу</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>

        {/* CSV Structure Example */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-white" />
              <h3 className="text-2xl font-bold text-white">📄 Структура CSV файлов</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="bg-gray-900 text-green-400 rounded-xl p-6 overflow-x-auto border-2 border-gray-700">
              <pre className="text-xs font-mono leading-relaxed">
{`Изображения,Название,Артикул,Бренд,Категория,Подкатегория,Описание,Мощность,Объем,Цвет...
https://cdn.entero.ru/img1.jpg;https://cdn.entero.ru/img2.jpg,Кофемашина X,ART-001,Brand,Кофеварки,Кофемашины,Описание,1800W,2L,Черный...`}
              </pre>
            </div>
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-5">
                <p className="font-bold text-blue-900 mb-3 flex items-center space-x-2">
                  <span>🔹</span>
                  <span>Разделители:</span>
                </p>
                <ul className="text-blue-800 space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <span>•</span>
                    <span>CSV: запятая (,)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span>•</span>
                    <span>Изображения: точка с запятой (;)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span>•</span>
                    <span>Характеристики: точка с запятой (;)</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-5">
                <p className="font-bold text-purple-900 mb-3 flex items-center space-x-2">
                  <span>📁</span>
                  <span>Организация файлов:</span>
                </p>
                <ul className="text-purple-800 space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <span>•</span>
                    <span>7 основных категорий</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span>•</span>
                    <span>431 файл CSV</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span>•</span>
                    <span>~126,000 товаров</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
