import { create } from 'zustand';

export interface CartItem {
    id: string;
    province: string;
    date: string;
    time: string;
    kyHieu: string;
    numbers: string;
    price: number;
    quantity: number;
    color: string;
}

interface CartStore {
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, delta: number) => void;
    clearCart: () => void;
}

export const useCartStore = create<CartStore>((set) => ({
    items: [],
    addItem: (item) => set((state) => {
        // Check if item already exists (same province, numbers, date)
        const existingItem = state.items.find(i => 
            i.province === item.province && 
            i.numbers === item.numbers && 
            i.date === item.date
        );
        
        if (existingItem) {
            return {
                items: state.items.map(i => 
                    i.id === existingItem.id 
                        ? { ...i, quantity: i.quantity + item.quantity }
                        : i
                )
            };
        }
        
        return {
            items: [...state.items, item]
        };
    }),
    removeItem: (id) => set((state) => ({
        items: state.items.filter(item => item.id !== id)
    })),
    updateQuantity: (id, delta) => set((state) => ({
        items: state.items.map(item => {
            if (item.id === id) {
                return { ...item, quantity: Math.max(1, item.quantity + delta) };
            }
            return item;
        })
    })),
    clearCart: () => set({ items: [] })
}));
