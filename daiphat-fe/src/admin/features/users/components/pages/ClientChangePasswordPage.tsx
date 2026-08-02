import { Breadcrumb } from '../../../../components/ui/Breadcrumb';
import { Title } from '../../../../components/ui/Title';
import { useUserDetail, useInitiateUserPasswordReset, useConfirmUserPasswordReset } from "../../hooks/useUsers";
import { prefixAdmin } from '../../../../constants/routes';
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { UserPasswordResetCard } from "../sections/UserPasswordResetCard";

export const ClientChangePasswordPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: user, isLoading } = useUserDetail(id);
    const { mutate: initiateReset, isPending: isInitiating } = useInitiateUserPasswordReset();
    const { mutate: confirmReset, isPending: isConfirming } = useConfirmUserPasswordReset();

    const handleInitiate = () => {
        initiateReset(id!, {
            onSuccess: () => {
                toast.success("Mã OTP đã được gửi đến email của bạn/hệ thống!");
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Không thể khởi tạo yêu cầu đặt lại mật khẩu");
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
                navigate(`/${prefixAdmin}/account-user/list`);
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
            <Box sx={{ mb: 5 }}>
                <Title title="Đặt lại mật khẩu" />
                <Breadcrumb
                    items={[
                        { label: "Dashboard", to: "/" },
                        { label: "Khách hàng", to: `/${prefixAdmin}/account-user/list` },
                        { label: "Đặt lại mật khẩu" }
                    ]}
                />
            </Box>

            <UserPasswordResetCard
                accountName={user?.fullName}
                email={user?.email}
                isInitiating={isInitiating}
                isConfirming={isConfirming}
                onInitiate={handleInitiate}
                onConfirm={handleConfirm}
                onCancel={() => navigate(-1)}
            />
        </Box>
    );
};
