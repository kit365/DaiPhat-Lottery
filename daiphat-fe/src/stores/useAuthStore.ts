import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";

import { STORAGE_KEYS } from "../constants/storage.constants";

import { User } from "../types/user.type";

interface AuthState {
    user: User | null;
    token: string | null;
    expiresAt: number | null;
    isHydrated: boolean;
    login: (user: User, token: string, expiresIn?: number) => void;
    logout: () => void;
    set: (newState: Partial<AuthState>) => void;
}

export const useAuthStore = create<AuthState>()(
    devtools(
        persist(
            (set) => ({
                user: null,
                token: null,
                expiresAt: null,
                isHydrated: false,
                login: (user, token, expiresIn) => set({ 
                    user, 
                    token, 
                    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null 
                }),
                logout: () => {
                    set({ user: null, token: null, expiresAt: null });
                },
                set: (newState) => set(newState),
            }),
            {
                name: STORAGE_KEYS.AUTH,
                partialize: (state) => ({ token: state.token, expiresAt: state.expiresAt }),
                onRehydrateStorage: () => (state) => {
                    if (state) {
                        state.set({ isHydrated: true });
                    }
                },
            }

        ),
        { name: "AuthStore" }
    )
);

if (import.meta.env.DEV) {
    useAuthStore.subscribe((state) => {
        console.log("Auth Store updated:", state);
    });
}
