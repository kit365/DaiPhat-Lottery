import { create } from "zustand";

interface QuickCheckState {
    isOpen: boolean;
    openModal: () => void;
    closeModal: () => void;
}

export const useQuickCheckStore = create<QuickCheckState>((set) => ({
    isOpen: false,
    openModal: () => set({ isOpen: true }),
    closeModal: () => set({ isOpen: false }),
}));
