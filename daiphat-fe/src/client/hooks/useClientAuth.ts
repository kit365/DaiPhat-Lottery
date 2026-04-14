import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { clientAuthApi } from "../api/auth.api";
import { LoginPayload, RegisterPayload } from "../types/auth.types";
import { useAuthStore } from "../../stores/useAuthStore";
import { User } from "../../types/user.type";

const isAuthSuccess = (payload?: { isSuccess?: boolean; success?: boolean; code?: string }) =>
  Boolean(payload?.isSuccess || payload?.success || payload?.code === "SUCCESS");

export const useClientLogin = () => {
  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: (payload: LoginPayload) => clientAuthApi.login(payload),
    onSuccess: (response) => {
      if (!isAuthSuccess(response)) {
        toast.error(response.message || "Đăng nhập thất bại");
        return;
      }

      const token = response.data?.access_token;
      const user = response.data?.user;

      if (!token || !user) {
        toast.error("Thiếu thông tin phiên đăng nhập");
        return;
      }

      loginStore(user as User, token, response.data?.expires_in);
      toast.success("Đăng nhập thành công");
      navigate("/");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Không thể đăng nhập, vui lòng thử lại";
      toast.error(message);
    },
  });
};

export const useClientRegister = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => clientAuthApi.register(payload),
    onSuccess: (response) => {
      if (!isAuthSuccess(response)) {
        toast.error(response.message || "Đăng ký thất bại");
        return;
      }

      toast.success(response.message || "Đăng ký thành công, vui lòng đăng nhập");
      navigate("/login");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Không thể đăng ký, vui lòng thử lại";
      toast.error(message);
    },
  });
};
