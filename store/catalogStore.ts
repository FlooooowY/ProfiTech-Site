import { create } from 'zustand';
import { Product, Filter } from '@/types';

interface CatalogStore {
  products: Product[];
  filteredProducts: Product[];
  filter: Filter;
  searchQuery: string;
  isLoading: boolean;
  
  setProducts: (products: Product[]) => void;
  setFilter: (filter: Partial<Filter>) => void;
  setSearchQuery: (query: string) => void;
  applyFilters: () => void;
  clearFilters: () => void;
}

export const useCatalogStore = create<CatalogStore>((set, get) => ({
  products: [],
  filteredProducts: [],
  filter: {
    manufacturers: [],
    characteristics: {},
  },
  searchQuery: '',
  isLoading: false,
  
  setProducts: (products: Product[]) => {
    const validProducts = products.filter(p => p && p.id);
    set({ products: validProducts, filteredProducts: validProducts, isLoading: false });
    // Применяем фильтры только если они установлены
    const { filter } = get();
    if (filter.categoryId || filter.subcategoryId || (filter.manufacturers && filter.manufacturers.length > 0) || Object.keys(filter.characteristics || {}).length > 0) {
      get().applyFilters();
    }
  },
  
  setFilter: (newFilter: Partial<Filter>) => {
    set((state) => ({
      filter: { ...state.filter, ...newFilter },
    }));
    get().applyFilters();
  },
  
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    get().applyFilters();
  },
  
  applyFilters: () => {
    try {
      const { products, filter, searchQuery } = get();
      
      // Фильтруем только валидные продукты
      let filtered = products.filter(p => p && p.id);
      
      // Фильтр по категории
      if (filter.categoryId) {
        filtered = filtered.filter((p) => p.categoryId === filter.categoryId);
      }
      
      // Фильтр по подкатегории
      if (filter.subcategoryId) {
        filtered = filtered.filter((p) => p.subcategoryId === filter.subcategoryId);
      }
      
      // Фильтр по производителю
      if (filter.manufacturers && filter.manufacturers.length > 0) {
        filtered = filtered.filter((p) =>
          p.manufacturer && filter.manufacturers.includes(p.manufacturer)
        );
      }
      
      // Фильтр по характеристикам
      if (filter.characteristics) {
        Object.entries(filter.characteristics).forEach(([key, values]) => {
          if (values && values.length > 0) {
            filtered = filtered.filter((p) =>
              p.characteristics && Array.isArray(p.characteristics) && p.characteristics.some(
                (char) => char && char.name === key && values.includes(char.value)
              )
            );
          }
        });
      }
      
      // Поиск
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            (p.name && p.name.toLowerCase().includes(query)) ||
            (p.description && p.description.toLowerCase().includes(query)) ||
            (p.manufacturer && p.manufacturer.toLowerCase().includes(query)) ||
            (p.characteristics && Array.isArray(p.characteristics) && p.characteristics.some((char) =>
              char && char.value && char.value.toLowerCase().includes(query)
            ))
        );
      }
      
      set({ filteredProducts: filtered });
    } catch (error) {
      console.error('Ошибка при применении фильтров:', error);
      set({ filteredProducts: get().products.filter(p => p && p.id) });
    }
  },
  
  clearFilters: () => {
    set((state) => ({
      filter: {
        manufacturers: [],
        characteristics: {},
      },
      searchQuery: '',
      filteredProducts: state.products,
    }));
  },
}));

