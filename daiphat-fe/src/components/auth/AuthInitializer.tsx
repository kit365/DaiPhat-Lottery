"use client";

import { useEffect } from "react";
import { STORAGE_KEYS } from "../../constants/storage.constants";
import { useAuthStore } from "../../stores/useAuthStore";
import { msUntilAccessRefresh, restoreAccessSessionIfNeeded } from "../../api/sessionBoot";

export const AuthInitializer = () => {
    const { isHydrated, token, user, isProfileSetupModalOpen, openProfileSetupModal } = useAuthStore();

    useEffect(() => {
        if (!isHydrated) return;
        void restoreAccessSessionIfNeeded();
    }, [isHydrated]);

    useEffect(() => {
        if (!isHydrated || !token) return;

        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const schedule = () => {
            const delay = msUntilAccessRefresh();
            if (delay == null) return;
            timer = setTimeout(() => {
                if (cancelled) return;
                void restoreAccessSessionIfNeeded().then(() => {
                    if (!cancelled) schedule();
                });
            }, delay);
        };

        schedule();

        const onVisible = () => {
            if (document.visibilityState === "visible") {
                void restoreAccessSessionIfNeeded();
            }
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [isHydrated, token]);

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
