import { useState } from "react";
import { Breadcrumb } from '../../../../components/ui/Breadcrumb';
import { Title } from '../../../../components/ui/Title';
import { useUserDetail, useInitiateUserPasswordReset, useConfirmUserPasswordReset } from "../../hooks/useUsers";
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

export const ClientChangePasswordPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: user, isLoading } = useUserDetail(id);
    const { mutate: initiateReset, isPending: isInitiating } = useInitiateUserPasswordReset();
    const { mutate: confirmReset, isPending: isConfirming } = useConfirmUserPasswordReset();

    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState("");

    const handleInitiate = () => {
        initiateReset(id!, {
            onSuccess: () => {
                setOtpSent(true);
                toast.success("Mã OTP đã được gửi đến email của bạn/hệ thống!");
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Không thể khởi tạo yêu cầu đặt lại mật khẩu");
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

            <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)" }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, fontSize: '1rem' }}>
                    Đặt lại mật khẩu cho: {user?.fullName}
                </Typography>
                <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary', fontSize: '0.8125rem' }}>
                    Email: {user?.email}
                </Typography>

                {!otpSent ? (
                    <Stack spacing={3}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Nhấn nút bên dưới để gửi mã xác thực (OTP) đặt lại mật khẩu. 
                            Hệ thống sẽ gửi mã đến email và sau khi xác nhận, một mật khẩu ngẫu nhiên sẽ được tạo và gửi cho người dùng.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <Button
                                variant="outlined"
                                onClick={() => navigate(-1)}
                                sx={{
                                    borderRadius: "var(--shape-borderRadius)",
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    textTransform: 'none'
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
                                    textTransform: 'none',
                                    '&:hover': { bgcolor: "var(--palette-grey-700)" }
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
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)" } }}
                        />
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <Button
                                variant="text"
                                onClick={() => setOtpSent(false)}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Quay lại
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleConfirm}
                                disabled={isConfirming || !otp}
                                sx={{
                                    bgcolor: 'var(--palette-text-primary)',
                                    color: "var(--palette-common-white)",
                                    borderRadius: "var(--shape-borderRadius)",
                                    px: 4,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    '&:hover': { bgcolor: "var(--palette-grey-700)" }
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
