import { useEffect } from "react";

import { showQueuedAdminLoginToast } from "@/admin/lib/adminLoginToast.utils";

/** Hiện toast đăng nhập sau khi shell admin đã mount (không hiện trên trang login). */
export const useAdminLoginSuccessToast = () => {
    useEffect(() => {
        showQueuedAdminLoginToast();
    }, []);
};
