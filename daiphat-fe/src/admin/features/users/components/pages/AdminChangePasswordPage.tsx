import { useState } from "react";
import { Breadcrumb } from '../../../../components/ui/Breadcrumb';
import { Title } from '../../../../components/ui/Title';
import { useUserDetail, useConfirmUserPasswordReset, useInitiateUserPasswordReset } from "../../hooks/useUsers";
import { prefixAdmin } from '../../../../constants/routes';
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import {
    Box,
    TextField,
    Button,
    Typography,
    Card,
    CircularProgress,
    Stack
} from "@mui/material";

export const AdminChangePasswordPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: account, isLoading } = useUserDetail(id);
    const { mutate: initiateReset, isPending: isInitiating } = useInitiateUserPasswordReset();
    const { mutate: confirmReset, isPending: isConfirming } = useConfirmUserPasswordReset();

    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState("");

    const handleInitiate = () => {
        initiateReset(id!, {
            onSuccess: () => {
                setOtpSent(true);
                toast.success("Mã OTP đã được gửi đến email người dùng.");
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Không thể gửi OTP");
            }
        });
    };

    const handleConfirm = () => {
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
            <Box sx={{ mb: 5 }}>
                <Title title="Đặt lại mật khẩu" />
                <Breadcrumb
                    items={[
                        { label: "Dashboard", to: "/" },
                        { label: "Quản trị viên", to: `/${prefixAdmin}/account-admin/list` },
                        { label: "Đặt lại mật khẩu" }
                    ]}
                />
            </Box>

            <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)" }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, fontSize: '1rem' }}>
                    Đặt lại mật khẩu cho: {account?.fullName}
                </Typography>
                <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary', fontSize: '0.8125rem' }}>
                    Email: {account?.email}
                </Typography>

                {!otpSent ? (
                    <Stack spacing={3}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Nhấn nút bên dưới để gửi mã OTP đặt lại mật khẩu. Sau khi xác nhận OTP, hệ thống sẽ tự tạo mật khẩu mới và gửi qua email người dùng.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 1 }}>
                            <Button
                                variant="outlined"
                                onClick={() => navigate(-1)}
                                sx={{
                                    borderRadius: "var(--shape-borderRadius)",
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    textTransform: 'none',
                                }}
                            >
                                Hủy
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleInitiate}
                                disabled={isInitiating}
                                sx={{
                                    bgcolor: 'var(--palette-text-primary)',
                                    color: "var(--palette-common-white)",
                                    borderRadius: "var(--shape-borderRadius)",
                                    px: 4,
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    textTransform: 'none',
                                    boxShadow: 'none',
                                    '&:hover': { bgcolor: "var(--palette-grey-700)", boxShadow: 'none' },
                                }}
                            >
                                {isInitiating ? "Đang gửi..." : "Gửi mã OTP"}
                            </Button>
                        </Box>
                    </Stack>
                ) : (
                    <Stack spacing={3}>
                        <TextField
                            label="Nhập mã OTP"
                            fullWidth
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="Nhập mã OTP gồm 6 chữ số"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)", fontSize: '0.875rem' } }}
                        />
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 1 }}>
                            <Button
                                variant="text"
                                onClick={() => setOtpSent(false)}
                                sx={{
                                    borderRadius: "var(--shape-borderRadius)",
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    textTransform: 'none',
                                }}
                            >
                                Quay lại
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleConfirm}
                                disabled={isConfirming || otp.length < 6}
                                sx={{
                                    bgcolor: 'var(--palette-text-primary)',
                                    color: "var(--palette-common-white)",
                                    borderRadius: "var(--shape-borderRadius)",
                                    px: 4,
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    textTransform: 'none',
                                    boxShadow: 'none',
                                    '&:hover': { bgcolor: "var(--palette-grey-700)", boxShadow: 'none' },
                                }}
                            >
                                {isConfirming ? "Đang xác thực..." : "Xác nhận đặt lại"}
                            </Button>
                        </Box>
                    </Stack>
                )}
            </Card>
        </Box>
    );
};
