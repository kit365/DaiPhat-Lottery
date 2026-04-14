import { useMutation } from "@tanstack/react-query";
import { authService } from "../services/auth.service";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../../stores/useAuthStore";
import { toast } from "react-toastify";
import { ROUTES } from "../../../constants/routes";
import { USER_ROLES } from "../../../../constants/role.constants";
import { LoginResponse } from "../types/auth.type";
import { User } from "../../../../types/user.type";
import { LoginFormValues } from "../../../schemas/login.schema";

export const useLogin = () => {
    const navigate = useNavigate();
    const loginStore = useAuthStore(state => state.login);

    // Khởi tạo mutation xử lý luồng đăng nhập admin
    const mutation = useMutation({
        // Gọi service login với dữ liệu từ form, mặc định tắt rememberMe để bảo mật vùng admin
        mutationFn: (data: LoginFormValues) => authService.login({ ...data, rememberMe: false } as any),
        onSuccess: (response: LoginResponse) => {
            // Log log phản hồi từ server để debug luồng phân quyền
            console.log("Login Response:", response);
            const isSuccess = response.isSuccess || response.success || response.code === "SUCCESS";
            
            if (isSuccess && response.data?.access_token) {
                const { access_token, user: userInfo } = response.data;

                if (userInfo) {
                    const mappedUser = {
                        ...userInfo,
                        fullName: `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim(),
                        avatar: (userInfo as any).avatarUrl || (userInfo as any).avatar || (userInfo as any).images?.[0]?.url,
                        roles: userInfo.roles ? userInfo.roles : (userInfo.role ? [userInfo.role] : []),
                    };

                    const r = mappedUser.roles?.[0];
                    const rawRole = typeof r === 'string' ? r : (r?.code || r?.name || "");
                    const normalizedRole = rawRole.toUpperCase().startsWith("ROLE_") 
                        ? rawRole.toUpperCase() 
                        : `ROLE_${rawRole.toUpperCase()}`;
                    
                    console.log("[Login Debug] Role Info:", { original: r, rawRole, normalizedRole });

                    const isAdmin = normalizedRole === USER_ROLES.ADMIN;
                    const isManager = normalizedRole === USER_ROLES.STAFF_MANAGER;
                    const isShipper = normalizedRole === USER_ROLES.STAFF_SHIPPER;

                    if (isAdmin || isManager || isShipper) {
                        loginStore(mappedUser as User, access_token, response.data.expires_in);

                        if (isAdmin) {
                            toast.success("Đăng nhập thành công! Chào mừng Quản trị viên.");
                            navigate(ROUTES.ADMIN.DASHBOARD.SYSTEM);
                        } else if (isManager) {
                            toast.success("Đăng nhập thành công! Chào mừng Quản lý.");
                            navigate(ROUTES.ADMIN.MANAGEMENT.ROOT);
                        } else {
                            toast.success("Đăng nhập thành công! Chào mừng Shipper.");
                            navigate(ROUTES.ADMIN.SHIPPING.ROOT);
                        }
                    } else {
                        console.log("❌ Không vô được điều kiện, role là:", normalizedRole);
                        toast.error("Tài khoản của bạn không có quyền truy cập vùng Quản trị!");
                    }
                } else {
                    toast.error("Không tìm thấy thông tin người dùng trong phản hồi!");
                }
            } else {
                if (response.message) toast.error(response.message);
            }
        },
        onError: (error: any) => {
            console.error("Login mutation error:", error);
            const serverMessage = error.response?.data?.message || error.response?.data?.error_description;
            toast.error(serverMessage || "Có lỗi xảy ra trong quá trình đăng nhập.");
        }
    });

    return {
        ...mutation,
        isPending: mutation.isPending
    };
};
