import { notifyPageNavigation } from "@/admin/context/PageNavigationContext";

const isAdminShellRoute = (path: string) =>
    path.startsWith("/admin") && !path.startsWith("/admin/auth");

/** Only show the top progress bar for in-app admin navigation (not login/auth flows). */
export const maybeNotifyAdminNavigation = (target: string) => {
    if (typeof window === "undefined") {
        return;
    }

    const currentPath = window.location.pathname;
    if (!isAdminShellRoute(currentPath) || !target.startsWith("/admin")) {
        return;
    }

    if (target.startsWith("/admin/auth")) {
        return;
    }

    notifyPageNavigation(target);
};
