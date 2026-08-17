import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import Cookies from "js-cookie";

import { STORAGE_KEYS } from "../constants/storage.constants";
import { User } from "../types/user.type";

const readCookieAccessToken = () => {
    if (typeof window === "undefined") return null;
    const value = Cookies.get(STORAGE_KEYS.TOKEN)?.trim();
    if (!value || value === "undefined" || value === "null") return null;
    return value;
};

/** Cookie `token` → RAM, rồi mở isHydrated. Không đọc localStorage. */
const markHydratedFromCookie = () => {
    const current = useAuthStore.getState().token;
    const cookieToken = readCookieAccessToken();
    useAuthStore.setState({
        isHydrated: true,
        token: current || cookieToken,
    });
};

interface AuthState {
    user: User | null;
    token: string | null;
    expiresAt: number | null;
    isHydrated: boolean;
    // Auth Modal States
    isLoginModalOpen: boolean;
    isRegisterModalOpen: boolean;
    isProfileSetupModalOpen: boolean;
    isVerifyModalOpen: boolean;
    isForgotPasswordModalOpen: boolean;
    verificationToken: string | null;
    verificationStatus: 'loading' | 'success' | 'error' | null;
    // Auth Actions
    login: (user: User, token: string, expiresIn?: number) => void;
    logout: () => void;
    set: (newState: Partial<AuthState>) => void;
    // Modal Actions
    openLoginModal: () => void;
    openRegisterModal: () => void;
    openForgotPasswordModal: () => void;
    openProfileSetupModal: () => void;
    openVerifyModal: (token: string) => void;
    closeForgotPasswordModal: () => void;
    closeVerifyModal: () => void;
    closeAuthModals: () => void;
}

export const useAuthStore = create<AuthState>()(
    devtools(
        persist(
            (set) => ({
                user: null,
                token: null,
                expiresAt: null,
                isHydrated: false,
                isLoginModalOpen: false,
                isRegisterModalOpen: false,
                isProfileSetupModalOpen: false,
                isVerifyModalOpen: false,
                isForgotPasswordModalOpen: false,
                verificationToken: null,
                verificationStatus: null,

                set: (newState) => set(newState),

                login: (user, token, expiresIn) => {
                    set({
                        user,
                        token,
                        expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
                        isLoginModalOpen: false,
                        isRegisterModalOpen: false,
                        isVerifyModalOpen: false,
                        isForgotPasswordModalOpen: false
                    });
                },

                logout: () => {
                    set({ user: null, token: null, expiresAt: null, isLoginModalOpen: false, isRegisterModalOpen: false, isVerifyModalOpen: false, isProfileSetupModalOpen: false, isForgotPasswordModalOpen: false });
                },

                openLoginModal: () => set({ isLoginModalOpen: true, isRegisterModalOpen: false, isVerifyModalOpen: false, isProfileSetupModalOpen: false, isForgotPasswordModalOpen: false }),
                openRegisterModal: () => set({ isRegisterModalOpen: true, isLoginModalOpen: false, isVerifyModalOpen: false, isProfileSetupModalOpen: false, isForgotPasswordModalOpen: false }),
                openForgotPasswordModal: () => set({ isForgotPasswordModalOpen: true, isLoginModalOpen: false, isRegisterModalOpen: false, isVerifyModalOpen: false, isProfileSetupModalOpen: false }),
                openProfileSetupModal: () => set({ isProfileSetupModalOpen: true, isLoginModalOpen: false, isRegisterModalOpen: false, isVerifyModalOpen: false, isForgotPasswordModalOpen: false }),
                openVerifyModal: (token: string) => set({ 
                    isVerifyModalOpen: true, 
                    verificationToken: token, 
                    verificationStatus: 'loading',
                    isLoginModalOpen: false, 
                    isRegisterModalOpen: false,
                    isProfileSetupModalOpen: false,
                    isForgotPasswordModalOpen: false
                }),
                closeForgotPasswordModal: () => set({ isForgotPasswordModalOpen: false }),
                closeVerifyModal: () => set({ isVerifyModalOpen: false, verificationToken: null, verificationStatus: null }),
                closeAuthModals: () => set({ 
                    isLoginModalOpen: false, 
                    isRegisterModalOpen: false, 
                    isProfileSetupModalOpen: false,
                    isVerifyModalOpen: false,
                    isForgotPasswordModalOpen: false
                }),
            }),
            {
                name: STORAGE_KEYS.AUTH,
                version: 2,
                // Access không persist localStorage — bản sống là cookie `token`.
                migrate: () => ({}),
                partialize: () => ({}),
                onRehydrateStorage: () => (_state, error) => {
                    if (error && typeof window !== "undefined") {
                        console.warn("Auth store rehydration failed", error);
                    }
                    if (typeof window !== "undefined") {
                        queueMicrotask(markHydratedFromCookie);
                    }
                },
            }
        ),
        { name: "AuthStore" }
    )
);

// Next.js client navigations can miss persist callbacks; ensure hydration unlocks.
if (typeof window !== "undefined") {
    const persistApi = (useAuthStore as typeof useAuthStore & {
        persist?: {
            hasHydrated?: () => boolean;
            onFinishHydration?: (cb: () => void) => () => void;
        };
    }).persist;

    if (persistApi?.hasHydrated?.()) {
        markHydratedFromCookie();
    } else {
        persistApi?.onFinishHydration?.(() => {
            markHydratedFromCookie();
        });
    }
}
