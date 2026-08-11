'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { authService } from '@/shared/auth/services/auth.service';
import { AppToast as toast } from '@/utils/toast.util';
import type { ForgotPasswordRequest, VerifyOtpRequest, ResetPasswordRequest } from '@/shared/auth/types/auth.type';

export const useForgotPassword = () => {
    const requestOtp = useMutation({
        mutationFn: (data: ForgotPasswordRequest) => authService.forgotPasswordRequest(data),
        onSuccess: (response) => {
            if (response.isSuccess || response.success) {
                toast.success('Mã OTP đã được gửi đến email của bạn.');
            } else {
                toast.error(response.message || 'Không thể gửi mã OTP.');
            }
        },
        onError: (error: { response?: { data?: { message?: string } } }) => {
            const message = error.response?.data?.message || 'Có lỗi xảy ra khi yêu cầu gửi OTP.';
            toast.error(message);
        },
    });

    const verifyOtp = useMutation({
        mutationFn: (data: VerifyOtpRequest) => authService.verifyResetOtp(data),
        onSuccess: (response) => {
            if (response.isSuccess || response.success) {
                toast.success('Xác thực OTP thành công.');
            } else {
                toast.error(response.message || 'Mã OTP không chính xác.');
            }
        },
        onError: (error: { response?: { data?: { message?: string } } }) => {
            const message = error.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.';
            toast.error(message);
        },
    });

    const resetPassword = useMutation({
        mutationFn: (data: ResetPasswordRequest) => authService.resetPassword(data),
        onSuccess: (response) => {
            if (response.isSuccess || response.success) {
                toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
            } else {
                toast.error(response.message || 'Không thể đổi mật khẩu.');
            }
        },
        onError: (error: { response?: { data?: { message?: string } } }) => {
            const message = error.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu.';
            toast.error(message);
        },
    });

    const usePasswordPolicy = () =>
        useQuery({
            queryKey: ['password-policy'],
            queryFn: async () => {
                const res = await authService.getPasswordPolicy();
                if (res.isSuccess || res.success) return res.data;
                throw new Error(res.message || 'Gánh thất bại khi lấy quy tắc mật khẩu');
            },
            staleTime: 1000 * 60 * 60,
        });

    return {
        requestOtp,
        verifyOtp,
        resetPassword,
        usePasswordPolicy,
        isPending: requestOtp.isPending || verifyOtp.isPending || resetPassword.isPending,
    };
};
