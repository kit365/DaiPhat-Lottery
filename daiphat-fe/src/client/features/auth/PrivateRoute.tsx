"use client";

import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../../stores/useAuthStore";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

export const PrivateRoute = ({ children }: { children?: React.ReactNode }) => {
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

  if (!isHydrated) {
    return <LoadingSpinner />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
