import { useEffect } from "react";
import { useAuth } from "../../admin/pages/authen/hooks/useAuth";
import { useAuthStore } from "../../stores/useAuthStore";

/**
 * AuthInitializer component
 * This component is mounted at the root level to handle silent authentication re-hydration.
 * It uses the useAuth hook which automatically fetches the user profile if a token exists.
 */
export const AuthInitializer = () => {
    const { token, isHydrated, user, isProfileSetupModalOpen, openProfileSetupModal } = useAuthStore();
    const { getMe } = useAuth();

    useEffect(() => {
        // DP-32 Setup Enforcement: Check if user needs to complete profile on load
        if (user && isHydrated && !isProfileSetupModalOpen) {
            const isSetupComplete = user.hasPassword && user.agreedToTerms;
            if (!isSetupComplete) {
                openProfileSetupModal();
            }
        }
    }, [user, isHydrated, isProfileSetupModalOpen, openProfileSetupModal]);

    return null; // This component doesn't render anything
};
