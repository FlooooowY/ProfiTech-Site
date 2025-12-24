'use client';

import { Product, ProductCharacteristic } from '@/types';
import { getCurrentLocale } from './i18n';

/**
 * Получает переведенное название товара
 */
export function getProductName(product: Product): string {
  const locale = getCurrentLocale();
  if (locale === 'en' && product.name_en) {
    return product.name_en;
  }
  return product.name;
}

/**
 * Получает переведенное описание товара
 */
export function getProductDescription(product: Product): string {
  const locale = getCurrentLocale();
  if (locale === 'en' && product.description_en) {
    return product.description_en;
  }
  return product.description;
}

/**
 * Получает переведенную характеристику товара
 */
export function getTranslatedCharacteristic(char: ProductCharacteristic): { name: string; value: string } {
  const locale = getCurrentLocale();
  return {
    name: (locale === 'en' && char.name_en) ? char.name_en : char.name,
    value: (locale === 'en' && char.value_en) ? char.value_en : char.value,
  };
}

/**
 * Получает все переведенные характеристики товара
 */
export function getTranslatedCharacteristics(characteristics: ProductCharacteristic[]): ProductCharacteristic[] {
  return characteristics.map(char => ({
    ...char,
    ...getTranslatedCharacteristic(char),
  }));
}

/**
 * Создает переведенную версию товара
 */
export function getTranslatedProduct(product: Product): Product {
  const locale = getCurrentLocale();
  return {
    ...product,
    name: getProductName(product),
    description: getProductDescription(product),
    characteristics: getTranslatedCharacteristics(product.characteristics),
  };
}

