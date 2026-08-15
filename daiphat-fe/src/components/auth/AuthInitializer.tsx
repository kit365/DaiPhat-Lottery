"use client";

import { useEffect } from "react";
import { STORAGE_KEYS } from "../../constants/storage.constants";
import { useAuthStore } from "../../stores/useAuthStore";
import { restoreAccessSessionIfNeeded } from "../../api/sessionBoot";

export const AuthInitializer = () => {
    const { isHydrated, user, isProfileSetupModalOpen, openProfileSetupModal } = useAuthStore();

    useEffect(() => {
        if (!isHydrated) return;
        void restoreAccessSessionIfNeeded();
    }, [isHydrated]);

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
