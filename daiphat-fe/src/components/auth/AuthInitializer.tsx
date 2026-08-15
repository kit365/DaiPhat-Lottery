"use client";

import { useEffect } from "react";
import { STORAGE_KEYS } from "../../constants/storage.constants";
import { useAuthStore } from "../../stores/useAuthStore";
import { hydrateAccessTokenFromCookie } from "../../api/authHeaders";

export const AuthInitializer = () => {
    const { isHydrated, user, isProfileSetupModalOpen, openProfileSetupModal } = useAuthStore();

    useEffect(() => {
        hydrateAccessTokenFromCookie();
    }, []);

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
