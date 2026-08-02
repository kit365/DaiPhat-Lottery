import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { toast } from "react-toastify";
export type CartVariant = Record<string, unknown>;
import { STORAGE_KEYS } from "../constants/storage.constants";

export interface WishlistItem {
    productId: string;
    quantity: number;
    variant?: CartVariant[];
    detail: {
        images: string[];
        slug: string;
        name: string;
        priceNew: number;
        priceOld: number;
        stock: number;
        attributeList?: Record<string, unknown>[];
        variants?: CartVariant[];
    };
    addedAt: string;
}

interface WishlistState {
    items: WishlistItem[];
    isHydrated: boolean;
    addToWishlist: (item: Omit<WishlistItem, "addedAt">) => void;
    removeFromWishlist: (productId: string, variant?: CartVariant[]) => void;
    toggleWishlist: (item: Omit<WishlistItem, "addedAt">) => void;
    isInWishlist: (productId: string, variant?: CartVariant[]) => boolean;
    updateQuantity: (productId: string, quantity: number, variant?: CartVariant[]) => void;
    set: (newState: Partial<WishlistState>) => void;
}

export const useWishlistStore = create<WishlistState>()(
    devtools(
        immer(
            persist(
                (set, get) => ({
                    items: [],
                    isHydrated: false,

                    addToWishlist: (newItem) => {
                        set((state) => {
                            const exists = state.items.some((item) => {
                                if (item.productId !== newItem.productId) return false;
                                if (!item.variant && !newItem.variant) return true;
                                if (!item.variant || !newItem.variant) return false;
                                return JSON.stringify(item.variant) === JSON.stringify(newItem.variant);
                            });

                            if (!exists) {
                                state.items.unshift({ ...newItem, addedAt: new Date().toISOString() });
                                toast.success("Đã thêm vào danh sách yêu thích!");
                            }
                        });
                    },

                    removeFromWishlist: (productId, variant) => {
                        set((state) => {
                            state.items = state.items.filter((item) => {
                                if (item.productId !== productId) return true;
                                if (!item.variant && !variant) return false;
                                if (!item.variant || !variant) return true;
                                return JSON.stringify(item.variant) !== JSON.stringify(variant);
                            });
                        });
                        toast.info("Đã xóa khỏi danh sách yêu thích");
                    },

                    toggleWishlist: (newItem) => {
                        const exists = get().items.some((item) => {
                            if (item.productId !== newItem.productId) return false;
                            if (!item.variant && !newItem.variant) return true;
                            if (!item.variant || !newItem.variant) return false;
                            return JSON.stringify(item.variant) === JSON.stringify(newItem.variant);
                        });

                        if (exists) {
                            get().removeFromWishlist(newItem.productId, newItem.variant);
                        } else {
                            get().addToWishlist(newItem);
                        }
                    },

                    isInWishlist: (productId, variant) => {
                        return get().items.some((item) => {
                            if (item.productId !== productId) return false;
                            if (!item.variant && !variant) return true;
                            if (!item.variant || !variant) return false;
                            return JSON.stringify(item.variant) === JSON.stringify(variant);
                        });
                    },

                    updateQuantity: (productId, quantity, variant) => {
                        set((state) => {
                            const index = state.items.findIndex((item) => {
                                if (item.productId !== productId) return false;
                                if (!item.variant && !variant) return true;
                                if (!item.variant || !variant) return false;
                                return JSON.stringify(item.variant) === JSON.stringify(variant);
                            });

                            if (index !== -1) {
                                const item = state.items[index];
                                const maxStock = item.detail.stock || 99;
                                state.items[index].quantity = Math.min(Math.max(1, quantity), maxStock);
                            }
                        });
                    },

                    set: set,
                }),
                {
                    name: STORAGE_KEYS.WISHLIST,
                    onRehydrateStorage: () => (state) => {
                        if (state) {
                            state.set({ isHydrated: true });
                        }
                    },
                }
            )
        ),
        { name: "WishlistStore" }
    )
);
