// Типы для категорий
export interface Category {
  id: string;
  name: string;
  slug: string;
  subcategories?: Subcategory[];
  icon?: string;
  description?: string;
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
}

// Типы для товаров
export interface Product {
  id: string;
  name: string;
  name_en?: string; // Английское название
  description: string;
  description_en?: string; // Английское описание
  categoryId: string;
  subcategoryId?: string;
  manufacturer: string;
  characteristics: ProductCharacteristic[];
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductCharacteristic {
  name: string;
  name_en?: string; // Английское название характеристики
  value: string;
  value_en?: string; // Английское значение характеристики
}

// Типы для корзины
export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
}

// Типы для фильтрации
export interface Filter {
  manufacturers: string[];
  characteristics: { [key: string]: string[] };
  categoryId?: string;
  subcategoryId?: string;
  searchQuery?: string;
}

// Типы для карусели
export interface CarouselImage {
  id: string;
  url: string;
  alt: string;
  title?: string;
  description?: string;
  link?: string;
}

// Типы для настроек сайта
export interface SiteSettings {
  logo: string;
  companyName: string;
  slogan: string;
  whatsappNumber: string;
  email: string;
  address: string;
  socialMedia: SocialMedia;
  carouselImages: CarouselImage[];
}

export interface SocialMedia {
  facebook?: string;
  instagram?: string;
  telegram?: string;
  whatsapp?: string;
}

// Типы для AI помощника
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
}

// Типы для админ-панели
export interface AdminUser {
  id: string;
  username: string;
  role: 'admin' | 'editor';
}

