"use client";

import { useEffect } from "react";
import { STORAGE_KEYS } from "../../constants/storage.constants";
import { useAuthStore } from "../../stores/useAuthStore";
import {
    msUntilAccessRefresh,
    restoreAccessSessionIfNeeded,
} from "../../api/sessionBoot";
import { resolveAccessToken } from "../../api/authHeaders";

export const AuthInitializer = () => {
    const { isHydrated, token, user, isProfileSetupModalOpen, openProfileSetupModal } = useAuthStore();
    const isLoggedIn = !!token;

    useEffect(() => {
        if (!isHydrated) return;
        void restoreAccessSessionIfNeeded();
    }, [isHydrated]);

    useEffect(() => {
        if (!isHydrated || !isLoggedIn) return;

        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const schedule = () => {
            if (!resolveAccessToken()) {
                return;
            }
            const delay = msUntilAccessRefresh();
            if (delay == null) return;
            timer = setTimeout(() => {
                if (cancelled) return;
                void restoreAccessSessionIfNeeded().then(() => {
                    if (!cancelled && resolveAccessToken()) {
                        schedule();
                    }
                });
            }, delay);
        };

        schedule();

        const onVisible = () => {
            if (document.visibilityState === "visible" && resolveAccessToken()) {
                void restoreAccessSessionIfNeeded();
            }
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [isHydrated, isLoggedIn]);

    useEffect(() => {
        if (!user || !isHydrated || isProfileSetupModalOpen) {
            return;
        }

        const shouldForceAfterOAuth = sessionStorage.getItem(STORAGE_KEYS.FORCE_PROFILE_SETUP) === "true";
        const shouldRequireProfileSetup = shouldForceAfterOAuth || !user.agreedToTerms;

        if (shouldRequireProfileSetup) {
            sessionStorage.removeItem(STORAGE_KEYS.FORCE_PROFILE_SETUP);
            openProfileSetupModal();
        }
    }, [user, isHydrated, isProfileSetupModalOpen, openProfileSetupModal]);

    return null; // This component doesn't render anything
};
