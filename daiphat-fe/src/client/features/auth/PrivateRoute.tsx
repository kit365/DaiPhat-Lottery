"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "../../../stores/useAuthStore";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

export const PrivateRoute = ({ children }: { children?: React.ReactNode }) => {
  const router = useRouter();
  const { token, isHydrated } = useAuthStore();

  // Failsafe: if persist rehydration callback is delayed/missed, unlock private routes.
  useEffect(() => {
    if (isHydrated) return;
    const persistApi = (useAuthStore as typeof useAuthStore & {
      persist?: {
        hasHydrated?: () => boolean;
        onFinishHydration?: (cb: () => void) => () => void;
      };
    }).persist;

    if (persistApi?.hasHydrated?.()) {
      useAuthStore.setState({ isHydrated: true });
      return;
    }

    const unsubscribe = persistApi?.onFinishHydration?.(() => {
      useAuthStore.setState({ isHydrated: true });
    });
    const timeoutId = window.setTimeout(() => {
      useAuthStore.setState({ isHydrated: true });
    }, 300);

    return () => {
      unsubscribe?.();
      window.clearTimeout(timeoutId);
    };
  }, [isHydrated]);

  useEffect(() => {
    if (isHydrated && !token) {
      router.replace("/login");
    }
  }, [isHydrated, token, router]);

  if (!isHydrated) {
    return <LoadingSpinner />;
  }

  if (!token) {
    return null;
  }

  return <>{children}</>;
};
