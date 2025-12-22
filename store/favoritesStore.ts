import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types';

interface FavoritesStore {
  favorites: Product[];
  addFavorite: (product: Product) => void;
  removeFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (product: Product) => void;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      
      addFavorite: (product: Product) => {
        set((state) => {
          if (state.favorites.find(fav => fav.id === product.id)) {
            return state; // Уже в избранном
          }
          return {
            favorites: [...state.favorites, product],
          };
        });
      },
      
      removeFavorite: (productId: string) => {
        set((state) => ({
          favorites: state.favorites.filter(fav => fav.id !== productId),
        }));
      },
      
      isFavorite: (productId: string) => {
        return get().favorites.some(fav => fav.id === productId);
      },
      
      toggleFavorite: (product: Product) => {
        const isFav = get().isFavorite(product.id);
        if (isFav) {
          get().removeFavorite(product.id);
        } else {
          get().addFavorite(product);
        }
      },
      
      clearFavorites: () => {
        set({ favorites: [] });
      },
    }),
    {
      name: 'profitech-favorites',
    }
  )
);


