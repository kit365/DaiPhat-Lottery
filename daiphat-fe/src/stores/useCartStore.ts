import { create } from 'zustand';

export interface CartItem {
    id: string;
    province: string;
    provinceIcon?: string;
    date: string;
    time: string;
    kyHieu: string;
    numbers: string;
    price: number;
    quantity: number;
    color: string;
    ticketImg?: string;
    maxStock?: number;
}

interface CartStore {
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, delta: number) => boolean;
    syncItemStock: (id: string, maxStock: number) => void;
    clearCart: () => void;
}

const resolveMaxStock = (maxStock?: number) =>
    typeof maxStock === 'number' && maxStock >= 0 ? maxStock : undefined;

export const useCartStore = create<CartStore>((set, get) => ({
    items: [],
    addItem: (item) => set((state) => {
        // Check if item already exists (same province, numbers, date)
        const existingItem = state.items.find(i =>
            i.province === item.province &&
            i.numbers === item.numbers &&
            i.date === item.date
        );

        if (existingItem) {
            const maxStock = resolveMaxStock(item.maxStock) ?? resolveMaxStock(existingItem.maxStock);
            const mergedQty = existingItem.quantity + item.quantity;
            const quantity = maxStock != null ? Math.min(mergedQty, Math.max(1, maxStock)) : mergedQty;

            return {
                items: state.items.map(i =>
                    i.id === existingItem.id
                        ? {
                            ...i,
                            quantity,
                            maxStock: maxStock ?? i.maxStock,
                            ticketImg: item.ticketImg ?? i.ticketImg,
                            provinceIcon: item.provinceIcon ?? i.provinceIcon,
                        }
                        : i
                )
            };
        }

        const maxStock = resolveMaxStock(item.maxStock);
        const quantity = maxStock != null
            ? Math.min(Math.max(1, item.quantity), Math.max(1, maxStock))
            : Math.max(1, item.quantity);

        return {
            items: [...state.items, { ...item, quantity, maxStock }]
        };
    }),
    removeItem: (id) => set((state) => ({
        items: state.items.filter(item => item.id !== id)
    })),
    updateQuantity: (id, delta) => {
        const item = get().items.find(i => i.id === id);
        if (!item) return false;

        const max = resolveMaxStock(item.maxStock) ?? 999;
        const newQty = item.quantity + delta;
        // Cho phép về 0 để hiện "Xóa"; vẫn kẹp theo tồn kho
        const clamped = Math.min(Math.max(0, newQty), Math.max(0, max));

        // Không đổi được (đã chạm min/max)
        if (clamped === item.quantity) return false;

        set((state) => ({
            items: state.items.map(i =>
                i.id === id ? { ...i, quantity: clamped } : i
            )
        }));
        return true;
    },
    syncItemStock: (id, maxStock) => set((state) => ({
        items: state.items.map(item => {
            if (item.id !== id) return item;
            const safeMax = Math.max(0, maxStock);
            return {
                ...item,
                maxStock: safeMax,
                quantity: safeMax === 0 ? item.quantity : Math.min(item.quantity, safeMax),
            };
        })
    })),
    clearCart: () => set({ items: [] })
}));
