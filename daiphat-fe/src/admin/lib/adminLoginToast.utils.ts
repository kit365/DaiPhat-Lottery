import { toast } from "react-toastify";

import { STORAGE_KEYS } from "@/constants/storage.constants";

type AdminLoginToastPayload = {
    type: "success" | "info";
    message: string;
};

export const queueAdminLoginToast = (payload: AdminLoginToastPayload): void => {
    sessionStorage.setItem(STORAGE_KEYS.ADMIN_LOGIN_TOAST, JSON.stringify(payload));
};

export const showQueuedAdminLoginToast = (): void => {
    const raw = sessionStorage.getItem(STORAGE_KEYS.ADMIN_LOGIN_TOAST);
    if (!raw) {
        return;
    }

    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_LOGIN_TOAST);

    try {
        const payload = JSON.parse(raw) as AdminLoginToastPayload;
        if (payload.type === "info") {
            toast.info(payload.message);
            return;
        }
        toast.success(payload.message);
    } catch {
        // Ignore corrupt payload.
    }
};
