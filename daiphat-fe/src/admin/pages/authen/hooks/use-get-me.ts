import { useQuery } from "@tanstack/react-query";
import { userService } from "../services/user.service";
import { useAuthStore } from "../../../../stores/useAuthStore";
import { useEffect } from "react";

export const useGetMe = () => {
    const { token, user, set, logout } = useAuthStore();
    
    const query = useQuery({
        queryKey: ["admin-me", token],
        queryFn: userService.getMe,
        // LUÔN GỌI API NẾU ĐÃ CÓ TOKEN ĐỂ CẬP NHẬT QUYỀN MỚI NHẤT
        enabled: !!token,
        retry: (failureCount, error: any) => {
            // Nếu là lỗi 500 hoặc mất kết nối thì đừng retry nữa cho mệt máy
            if (error?.response?.status >= 500 || !error?.response) return false;
            return failureCount < 1;
        },
        refetchOnWindowFocus: false, // Tắt tự động refetch khi focus lại tab (tránh spam khi backend tèo)
        staleTime: 1000 * 60 * 10, // 10 minutes (RAM Cache)
        gcTime: 1000 * 60 * 60,    // 1 hour
    });

    useEffect(() => {
        if (query.data) {
            const isSuccess = query.data.isSuccess || query.data.code === "SUCCESS";
            if (isSuccess && query.data.data) {
                const userData = query.data.data;
                // Map fields from BE DTO to FE interface
                const mappedUser = {
                    ...userData,
                    fullName: `${userData.firstName} ${userData.lastName}`,
                    avatar: userData.avatarUrl || userData.avatar,
                    roles: userData.role ? [userData.role] : userData.roles || [],
                };
                
                // CHỈ UPDATE NẾU DỮ LIỆU THỰC SỰ KHÁC BIỆT
                const currentUser = useAuthStore.getState().user;
                if (JSON.stringify(currentUser) !== JSON.stringify(mappedUser)) {
                    console.log("[useGetMe] User data changed, updating store...");
                    set({ user: mappedUser });
                }
            } else if (!isSuccess && query.data.code === "UNAUTHORIZED") {
                logout();
            }
        }
    }, [query.data, set, logout]);

    return query;
};
