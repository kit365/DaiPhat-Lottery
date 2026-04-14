import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { toast } from "react-toastify";
import { STORAGE_KEYS } from "../constants/storage.constants";

export interface CartVariant {
    attrId: string;
    attrType: string;
    label: string;
    value: string;
}

export interface CartItem {
    productId: string;
    quantity: number;
    checked: boolean;
    variant?: CartVariant[];
    detail: {
        images: string[];
        slug: string;
        name: string;
        priceNew: number;
        priceOld: number;
        stock: number;
        attributeList?: any[];
        variants?: any[];
    };
}

interface CartState {
    items: CartItem[];
    isHydrated: boolean;
    addToCart: (item: CartItem) => boolean;
    removeFromCart: (productId: string, variant?: CartVariant[]) => void;
    updateQuantity: (productId: string, quantity: number, variant?: CartVariant[]) => void;
    toggleCheck: (productId: string, variant?: CartVariant[]) => void;
    toggleAll: () => void;
    setChecked: (productId: string, checked: boolean, variant?: CartVariant[]) => void;
    clearCart: () => void;
    syncCart: (syncedItems: CartItem[]) => void;
    totalAmount: () => number;
    totalItems: () => number;
    set: (newState: Partial<CartState>) => void;
}

export const useCartStore = create<CartState>()(
    devtools(
        immer(
            persist(
                (set, get) => ({
                    // ... (rest of the store logic remains exactly the same)
                    items: [],
                    isHydrated: false,

                    addToCart: (newItem) => {
                        let success = true;
                        set((state) => {
                            const existingIndex = state.items.findIndex((item) => {
                                if (item.productId !== newItem.productId) return false;
                                if (!item.variant && !newItem.variant) return true;
                                if (!item.variant || !newItem.variant) return false;
                                if (item.variant.length !== newItem.variant.length) return false;
                                return item.variant.every((attr) => {
                                    const match = newItem.variant?.find(
                                        (a) => a.attrId === attr.attrId && a.value === attr.value
                                    );
                                    return !!match;
                                });
                            });

                            if (existingIndex !== -1) {
                                const currentQty = state.items[existingIndex].quantity;
                                const maxStock = newItem.detail.stock;

                                if (currentQty + newItem.quantity > maxStock) {
                                    toast.error(`Bạn đã có ${currentQty} sản phẩm trong giỏ. Không thể thêm quá tồn kho (${maxStock})!`);
                                    success = false;
                                    return;
                                }

                                state.items[existingIndex].quantity += newItem.quantity;
                                state.items[existingIndex].detail = newItem.detail;
                            } else {
                                if (newItem.quantity > newItem.detail.stock) {
                                    toast.error(`Số lượng yêu cầu vượt quá tồn kho (${newItem.detail.stock})!`);
                                    success = false;
                                    return;
                                }
                                state.items.unshift(newItem);
                            }
                        });
                        return success;
                    },

                    removeFromCart: (productId, variant) => {
                        set((state) => {
                            state.items = state.items.filter((item) => {
                                const isSameId = item.productId === productId;
                                if (!isSameId) return true;

                                if (!item.variant && !variant) return false;
                                if (!item.variant || !variant) return true;
                                if (item.variant.length !== variant.length) return true;

                                const isSameVariant = item.variant.every((attr) => {
                                    const match = variant.find(
                                        (a) => a.attrId === attr.attrId && a.value === attr.value
                                    );
                                    return !!match;
                                });

                                return !isSameVariant;
                            });
                        });
                    },

                    updateQuantity: (productId, quantity, variant) => {
                        set((state) => {
                            const existingIndex = state.items.findIndex((item) => {
                                if (item.productId !== productId) return false;
                                if (!item.variant && !variant) return true;
                                if (!item.variant || !variant) return false;
                                if (item.variant.length !== variant.length) return false;
                                return item.variant.every((attr) => {
                                    const match = variant.find(
                                        (a) => a.attrId === attr.attrId && a.value === attr.value
                                    );
                                    return !!match;
                                });
                            });

                            if (existingIndex !== -1) {
                                const maxStock = state.items[existingIndex].detail.stock;
                                if (quantity > maxStock) {
                                    state.items[existingIndex].quantity = maxStock;
                                    toast.warning(`Đã tự động chỉnh về giới hạn tồn kho (${maxStock})`);
                                } else if (quantity <= 0) {
                                    state.items.splice(existingIndex, 1);
                                } else {
                                    state.items[existingIndex].quantity = quantity;
                                }
                            }
                        });
                    },

                    toggleCheck: (productId, variant) => {
                        set((state) => {
                            const item = state.items.find((item) => {
                                if (item.productId !== productId) return false;
                                if (!item.variant && !variant) return true;
                                if (!item.variant || !variant) return false;
                                if (item.variant.length !== variant.length) return false;
                                return item.variant.every((attr) => {
                                    const match = variant.find(
                                        (a) => a.attrId === attr.attrId && a.value === attr.value
                                    );
                                    return !!match;
                                });
                            });
                            if (item) {
                                item.checked = !item.checked;
                            }
                        });
                    },

                    toggleAll: () => {
                        set((state) => {
                            const allChecked = state.items.every(item => item.checked);
                            state.items.forEach(item => {
                                item.checked = !allChecked;
                            });
                        });
                    },

                    setChecked: (productId, checked, variant) => {
                        set((state) => {
                            const item = state.items.find((item) => {
                                if (item.productId !== productId) return false;
                                if (!item.variant && !variant) return true;
                                if (!item.variant || !variant) return false;
                                if (item.variant.length !== variant.length) return false;
                                return item.variant.every((attr) => {
                                    const match = variant.find(
                                        (a) => a.attrId === attr.attrId && a.value === attr.value
                                    );
                                    return !!match;
                                });
                            });
                            if (item) {
                                item.checked = checked;
                            }
                        });
                    },

                    clearCart: () => set({ items: [] }),

                    syncCart: (syncedItems) => {
                        set((state) => {
                            // Khi đồng bộ, ta giữ lại trạng thái 'checked' của item cũ nếu nó tồn tại
                            state.items = syncedItems.map(newItem => {
                                const oldItem = state.items.find(i =>
                                    i.productId === newItem.productId &&
                                    JSON.stringify(i.variant) === JSON.stringify(newItem.variant)
                                );
                                return {
                                    ...newItem,
                                    checked: oldItem ? oldItem.checked : newItem.checked
                                };
                            });
                        });
                    },

                    totalAmount: () =>
                        (get().items || []).reduce((sum, item) => {
                            if (!item || !item.checked || !item.detail) return sum;
                            return sum + (item.detail.priceNew || 0) * item.quantity;
                        }, 0),

                    totalItems: () =>
                        (get().items || []).reduce((sum, item) => sum + (item?.quantity || 0), 0),

                    set: set
                }),
                {
                    name: STORAGE_KEYS.CART,
                    onRehydrateStorage: () => (state) => {
                        if (state) {
                            state.set({ isHydrated: true });
                        }
                    },
                }
            )
        ),
        { name: "CartStore" }
    )
);

if (import.meta.env.DEV) {
    useCartStore.subscribe((state) => {
        console.log("Cart Store updated:", state);
    });
}

// Đồng bộ cache giữa các tab
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEYS.CART) {
            useCartStore.persist.rehydrate();
        }
    });
}
