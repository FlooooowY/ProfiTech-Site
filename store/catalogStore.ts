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
    set({ products: validProducts, isLoading: false });
    // Всегда применяем фильтры после загрузки товаров
    get().applyFilters();
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
      
      if (products.length === 0) {
        set({ filteredProducts: [] });
        return;
      }
      
      // Фильтруем только валидные продукты один раз
      let filtered = products.filter(p => p && p.id);
      
      // Применяем фильтры последовательно для оптимизации
      // Фильтр по категории
      if (filter.categoryId) {
        filtered = filtered.filter((p) => p.categoryId === filter.categoryId);
      }
      
      // Фильтр по подкатегории (только если есть категория)
      if (filter.subcategoryId && filtered.length > 0) {
        filtered = filtered.filter((p) => p.subcategoryId === filter.subcategoryId);
      }
      
      // Фильтр по производителю (оптимизирован с Set для быстрого поиска)
      if (filter.manufacturers && filter.manufacturers.length > 0 && filtered.length > 0) {
        const manufacturerSet = new Set(filter.manufacturers);
        filtered = filtered.filter((p) => p.manufacturer && manufacturerSet.has(p.manufacturer));
      }
      
      // Фильтр по характеристикам (оптимизирован)
      if (filter.characteristics && Object.keys(filter.characteristics).length > 0 && filtered.length > 0) {
        Object.entries(filter.characteristics).forEach(([key, values]) => {
          if (values && values.length > 0 && filtered.length > 0) {
            const valueSet = new Set(values);
            filtered = filtered.filter((p) => {
              if (!p.characteristics || !Array.isArray(p.characteristics)) return false;
              return p.characteristics.some(
                (char) => char && char.name === key && valueSet.has(char.value)
              );
            });
          }
        });
      }
      
      // Поиск (только если есть запрос)
      if (searchQuery && searchQuery.trim() && filtered.length > 0) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter((p) => {
          if (p.name && p.name.toLowerCase().includes(query)) return true;
          if (p.description && p.description.toLowerCase().includes(query)) return true;
          if (p.manufacturer && p.manufacturer.toLowerCase().includes(query)) return true;
          if (p.characteristics && Array.isArray(p.characteristics)) {
            return p.characteristics.some((char) =>
              char && char.value && char.value.toLowerCase().includes(query)
            );
          }
          return false;
        });
      }
      
      set({ filteredProducts: filtered });
    } catch (error) {
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

