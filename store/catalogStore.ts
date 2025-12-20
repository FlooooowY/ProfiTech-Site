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
    set({ products, filteredProducts: products });
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
    const { products, filter, searchQuery } = get();
    
    let filtered = [...products];
    
    // Фильтр по категории
    if (filter.categoryId) {
      filtered = filtered.filter((p) => p.categoryId === filter.categoryId);
    }
    
    // Фильтр по подкатегории
    if (filter.subcategoryId) {
      filtered = filtered.filter((p) => p.subcategoryId === filter.subcategoryId);
    }
    
    // Фильтр по производителю
    if (filter.manufacturers.length > 0) {
      filtered = filtered.filter((p) =>
        filter.manufacturers.includes(p.manufacturer)
      );
    }
    
    // Фильтр по характеристикам
    Object.entries(filter.characteristics).forEach(([key, values]) => {
      if (values.length > 0) {
        filtered = filtered.filter((p) =>
          p.characteristics.some(
            (char) => char.name === key && values.includes(char.value)
          )
        );
      }
    });
    
    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.manufacturer.toLowerCase().includes(query) ||
          p.characteristics.some((char) =>
            char.value.toLowerCase().includes(query)
          )
      );
    }
    
    set({ filteredProducts: filtered });
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

