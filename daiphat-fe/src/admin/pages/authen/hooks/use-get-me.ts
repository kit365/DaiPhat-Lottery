import { useQuery } from "@tanstack/react-query";
import { userService } from "../services/user.service";
import { useAuthStore } from "../../../../stores/useAuthStore";
import { useEffect } from "react";

export const useGetMe = () => {
    const { token, user, set, logout } = useAuthStore();
    
    const query = useQuery({
        queryKey: ["admin-me", token],
        queryFn: userService.getMe,
        // CHỈ GỌI API NẾU ĐÃ CÓ TOKEN NHƯNG CHƯA CÓ USER (VD: F5 TẢI LẠI TRANG)
        enabled: !!token && !user,
        retry: 1,
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
