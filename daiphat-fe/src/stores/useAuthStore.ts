import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";

interface User {
    id?: string;
    fullName: string;
    email: string;
    phone?: string;
    avatar?: string;
    permissions?: string[];
    roles?: any[];
    totalPoint?: number;
    usedPoint?: number;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isHydrated: boolean;
    login: (user: User, token: string) => void;
    logout: () => void;
    set: (newState: Partial<AuthState>) => void;
}

export const useAuthStore = create<AuthState>()(
    devtools(
        persist(
            (set) => ({
                user: null,
                token: null,
                isHydrated: false,
                login: (user, token) => set({ user, token }),
                logout: () => {
                    set({ user: null, token: null });
                },
                set: (newState) => set(newState),
            }),
            {
                name: "auth-storage",
                partialize: (state) => ({ token: state.token }),
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
