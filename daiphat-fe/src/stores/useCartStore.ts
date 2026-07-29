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
    /** Phiên "Mua ngay" — thanh toán riêng, không đụng giỏ hàng chính. */
    buyNowItems: CartItem[] | null;
    addItem: (item: CartItem) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, delta: number) => boolean;
    syncItemStock: (id: string, maxStock: number) => void;
    clearCart: () => void;
    startBuyNow: (items: CartItem[]) => void;
    clearBuyNow: () => void;
    /** Cập nhật số lượng trong phiên mua ngay. */
    updateBuyNowQuantity: (id: string, delta: number) => boolean;
    removeBuyNowItem: (id: string) => void;
    /**
     * Sau khi thanh toán mua ngay thành công:
     * chỉ trừ đúng các vé vừa mua khỏi giỏ chính (nếu trùng), giữ các vé còn lại.
     */
    applyBuyNowPurchaseToCart: () => void;
}

const resolveMaxStock = (maxStock?: number) =>
    typeof maxStock === 'number' && maxStock >= 0 ? maxStock : undefined;

const clampQuantity = (quantity: number, maxStock?: number) => {
    const max = resolveMaxStock(maxStock) ?? 999;
    return Math.min(Math.max(0, quantity), Math.max(0, max));
};

export const useCartStore = create<CartStore>((set, get) => ({
    items: [],
    buyNowItems: null,
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
    clearCart: () => set({ items: [] }),
    startBuyNow: (items) => set({
        buyNowItems: items
            .filter((item) => item.quantity > 0)
            .map((item) => ({ ...item })),
    }),
    clearBuyNow: () => set({ buyNowItems: null }),
    updateBuyNowQuantity: (id, delta) => {
        const buyNowItems = get().buyNowItems;
        if (!buyNowItems) return false;
        const item = buyNowItems.find((i) => i.id === id);
        if (!item) return false;

        const clamped = clampQuantity(item.quantity + delta, item.maxStock);
        if (clamped === item.quantity) return false;

        set({
            buyNowItems: buyNowItems.map((i) =>
                i.id === id ? { ...i, quantity: clamped } : i
            ),
        });
        return true;
    },
    removeBuyNowItem: (id) => set((state) => ({
        buyNowItems: state.buyNowItems
            ? state.buyNowItems.filter((item) => item.id !== id)
            : null,
    })),
    applyBuyNowPurchaseToCart: () => {
        const { buyNowItems, items } = get();
        if (!buyNowItems?.length) {
            set({ buyNowItems: null });
            return;
        }

        const purchasedQtyById = new Map<string, number>();
        for (const purchased of buyNowItems) {
            purchasedQtyById.set(
                purchased.id,
                (purchasedQtyById.get(purchased.id) ?? 0) + purchased.quantity
            );
        }

        const nextItems = items
            .map((item) => {
                const purchasedQty = purchasedQtyById.get(item.id);
                if (!purchasedQty) return item;
                return {
                    ...item,
                    quantity: Math.max(0, item.quantity - purchasedQty),
                };
            })
            .filter((item) => item.quantity > 0);

        set({ items: nextItems, buyNowItems: null });
    },
}));
