import { useEffect } from "react";
import { STORAGE_KEYS } from "../../constants/storage.constants";
import { useAuthStore } from "../../stores/useAuthStore";

/**
 * AuthInitializer component
 * This component is mounted at the root level to handle silent authentication re-hydration.
 * It uses the useAuth hook which automatically fetches the user profile if a token exists.
 */
export const AuthInitializer = () => {
    const { isHydrated, user, isProfileSetupModalOpen, openProfileSetupModal } = useAuthStore();

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
