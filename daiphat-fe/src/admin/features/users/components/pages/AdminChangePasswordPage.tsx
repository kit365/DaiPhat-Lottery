"use client";

import { PageHeader } from '../../../../components/ui/PageHeader';
import { useUserDetail, useConfirmUserPasswordReset, useInitiateUserPasswordReset } from "../../hooks/useUsers";
import { prefixAdmin } from '../../../../constants/routes';
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { UserPasswordResetCard } from "../sections/UserPasswordResetCard";

export const AdminChangePasswordPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: account, isLoading } = useUserDetail(id);
    const { mutate: initiateReset, isPending: isInitiating } = useInitiateUserPasswordReset();
    const { mutate: confirmReset, isPending: isConfirming } = useConfirmUserPasswordReset();

    const handleInitiate = () => {
        initiateReset(id!, {
            onSuccess: () => {
                toast.success("Mã OTP đã được gửi đến email người dùng.");
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Không thể gửi OTP");
            }
        });
    };

    const handleConfirm = (otp: string) => {
        if (!otp || otp.length < 6) {
            toast.warning("Vui lòng nhập mã OTP hợp lệ");
            return;
        }

        confirmReset({ id: id!, otp }, {
            onSuccess: () => {
                toast.success("Đặt lại mật khẩu thành công! Mật khẩu mới đã được gửi đến email người dùng.");
                navigate(`/${prefixAdmin}/account-admin/list`);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Xác thực OTP thất bại");
            }
        });
    };

    if (isLoading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
        </Box>
    );

    return (
        <Box sx={{ maxWidth: '600px', mx: 'auto' }}>
            <PageHeader
                title="Đặt lại mật khẩu"
                breadcrumbItems={[
                    { label: "Dashboard", to: "/" },
                    { label: "Quản trị viên", to: `/${prefixAdmin}/account-admin/list` },
                    { label: "Đặt lại mật khẩu" }
                ]}
            />

            <UserPasswordResetCard
                accountName={account?.fullName}
                email={account?.email}
                isInitiating={isInitiating}
                isConfirming={isConfirming}
                onInitiate={handleInitiate}
                onConfirm={handleConfirm}
                onCancel={() => navigate(-1)}
            />
        </Box>
    );
};
