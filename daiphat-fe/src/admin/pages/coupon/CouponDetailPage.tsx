import {
    Box,
    Card,
    Stack,
    Grid,
    Typography,
    Chip,
    IconButton,
    Button,
    CircularProgress,
    Divider,
    alpha,
    MenuItem,
    Select
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { useCouponDetail } from "./hooks/useCoupon";
import { prefixAdmin } from "../../constants/routes";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { useDeleteCoupon, useUpdateCoupon } from "./hooks/useCoupon";
import { toast } from "react-toastify";

const TYPE_DISCOUNT_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    percentage: {
        label: "Phần trăm (%)",
        color: "var(--palette-warning-dark)",
        bg: "var(--palette-warning-lighter)",
        icon: "solar:tag-bold-duotone"
    },
    fixed: {
        label: "Số tiền cố định",
        color: "var(--palette-info-dark)",
        bg: "var(--palette-info-lighter)",
        icon: "solar:wallet-money-bold-duotone"
    },
};

const TYPE_DISPLAY_MAP: Record<string, { label: string; color: string; bg: string }> = {
    public: { label: "Công khai", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
    private: { label: "Riêng tư", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: "Hoạt động", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
    inactive: { label: "Tạm dừng", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
};

const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1.25 }}>
        <Typography variant="body2" sx={{ color: "var(--palette-text-disabled)", flexShrink: 0, minWidth: 160 }}>
            {label}
        </Typography>
        <Box sx={{ textAlign: "right" }}>{children}</Box>
    </Stack>
);

export const CouponDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: coupon, isLoading } = useCouponDetail(id);
    const { mutate: deleteCoupon, isPending: isDeleting } = useDeleteCoupon();
    const { mutate: updateCouponStatus } = useUpdateCoupon();

    const handleStatusChange = (newStatus: string) => {
        updateCouponStatus({ id: id!, data: { status: newStatus } }, {
            onSuccess: (res: any) => {
                if (res.success) {
                    toast.success("Cập nhật trạng thái thành công");
                }
            }
        });
    };

    const handleDelete = () => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa mã giảm giá này?")) return;
        deleteCoupon(id!, {
            onSuccess: (res: any) => {
                if (res.success) {
                    toast.success("Xóa mã giảm giá thành công");
                    navigate(`/${prefixAdmin}/coupon/list`);
                } else {
                    toast.error(res.message);
                }
            }
        });
    };

    if (isLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 20 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!coupon) {
        return (
            <Box sx={{ p: 5, textAlign: "center" }}>
                <Typography sx={{ color: "var(--palette-text-primary)" }}>
                    Không tìm thấy mã giảm giá
                </Typography>
            </Box>
        );
    }

    const typeDiscount = TYPE_DISCOUNT_MAP[coupon.typeDiscount] || TYPE_DISCOUNT_MAP.percentage;
    const typeDisplay = TYPE_DISPLAY_MAP[coupon.typeDisplay] || TYPE_DISPLAY_MAP.private;
    const status = STATUS_MAP[coupon.status] || STATUS_MAP.inactive;

    const startDateStr = coupon.startDateFormat || (coupon.startDate ? dayjs(coupon.startDate).format("DD/MM/YYYY") : null);
    const endDateStr = coupon.endDateFormat || (coupon.endDate ? dayjs(coupon.endDate).format("DD/MM/YYYY") : null);

    const usagePercent = coupon.usageLimit > 0
        ? Math.min(100, Math.round(((coupon.usedCount || 0) / coupon.usageLimit) * 100))
        : 0;

    return (
        <>
            {/* Header */}
            <Box sx={{ mb: 4, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <IconButton
                            onClick={() => navigate(`/${prefixAdmin}/coupon/list`)}
                            sx={{ color: "var(--palette-action-active)", p: 0.75, mr: 0.5 }}
                        >
                            <Icon icon="eva:arrow-ios-back-fill" width={20} />
                        </IconButton>
                        <Title title="Chi tiết mã giảm giá" />
                    </Box>
                    <Box sx={{ pl: "44px" }}>
                        <Breadcrumb
                            items={[
                                { label: "Dashboard", to: "/" },
                                { label: "Mã giảm giá", to: `/${prefixAdmin}/coupon/list` },
                                { label: coupon.name || "Chi tiết" },
                            ]}
                        />
                    </Box>
                </Box>

                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Select
                        size="small"
                        value={coupon.status || "inactive"}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        sx={{
                            minWidth: 140,
                            height: 36,
                            borderRadius: '8px',
                            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: (theme) => alpha(theme.palette.grey[500], 0.32),
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'var(--palette-text-primary)'
                            },
                            '& .MuiSelect-select': {
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'var(--palette-text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                py: 0
                            }
                        }}
                        IconComponent={(props) => (
                            <Icon icon="eva:chevron-down-fill" {...props} width={20} />
                        )}
                    >
                        {Object.entries(STATUS_MAP).map(([value, opt]) => (
                            <MenuItem
                                key={value}
                                value={value}
                                sx={{
                                    fontSize: '0.875rem',
                                    borderRadius: '6px',
                                    mx: 0.5,
                                    my: 0.25
                                }}
                            >
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>

                    <Button
                        variant="outlined"
                        startIcon={<Icon icon="solar:trash-bin-trash-bold" />}
                        onClick={handleDelete}
                        disabled={isDeleting}
                        sx={{
                            height: 36,
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            textTransform: "none",
                            borderRadius: "8px",
                            borderColor: (theme) => alpha(theme.palette.error.main, 0.48),
                            color: "var(--palette-error-main)",
                            "&:hover": {
                                borderColor: "var(--palette-error-main)",
                                bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                            },
                        }}
                    >
                        Xóa
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Icon icon="solar:pen-bold" />}
                        onClick={() => navigate(`/${prefixAdmin}/coupon/edit/${id}`)}
                        sx={{
                            height: 36,
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            textTransform: "none",
                            borderRadius: "8px",
                            bgcolor: "var(--palette-grey-800)",
                            color: "common.white",
                            "&:hover": { bgcolor: "var(--palette-grey-900)" },
                        }}
                    >
                        Chỉnh sửa
                    </Button>
                </Stack>
            </Box>

            <Grid container spacing={3}>
                {/* Left column */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Stack spacing={3}>
                        {/* Basic Info */}
                        <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 3, pb: 2 }}>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: "var(--shape-borderRadius-md)",
                                        bgcolor: "var(--palette-primary-lighter)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Icon icon="solar:tag-bold-duotone" width={28} color="var(--palette-primary-main)" />
                                </Box>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--palette-text-primary)", fontSize: "1.125rem" }}>
                                        {coupon.name}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "var(--palette-text-disabled)", mt: 0.25 }}>
                                        {coupon.description || "Không có mô tả"}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={status.label}
                                    size="small"
                                    sx={{
                                        fontWeight: 700,
                                        height: 24,
                                        fontSize: "0.75rem",
                                        borderRadius: "var(--shape-borderRadius-sm)",
                                        color: status.color,
                                        bgcolor: status.bg,
                                    }}
                                />
                            </Stack>

                            <Divider sx={{ borderStyle: "dashed" }} />

                            <Box sx={{ px: 3, py: 1 }}>
                                <InfoRow label="Mã giảm giá">
                                    <Typography
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: "0.9375rem",
                                            color: "var(--palette-info-dark)",
                                            bgcolor: "var(--palette-info-lighter)",
                                            px: 1.5,
                                            py: 0.5,
                                            borderRadius: "var(--shape-borderRadius-sm)",
                                            letterSpacing: "0.08em",
                                            display: "inline-block",
                                        }}
                                    >
                                        {coupon.code}
                                    </Typography>
                                </InfoRow>
                                <Divider sx={{ borderStyle: "dashed" }} />
                                <InfoRow label="Loại giảm giá">
                                    <Chip
                                        label={typeDiscount.label}
                                        size="small"
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: "0.75rem",
                                            borderRadius: "var(--shape-borderRadius-sm)",
                                            color: typeDiscount.color,
                                            bgcolor: typeDiscount.bg,
                                        }}
                                    />
                                </InfoRow>
                                <Divider sx={{ borderStyle: "dashed" }} />
                                <InfoRow label="Giá trị giảm">
                                    <Typography sx={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--palette-primary-main)" }}>
                                        {coupon.typeDiscount === "percentage"
                                            ? `${coupon.value}%`
                                            : `${(coupon.value || 0).toLocaleString("vi-VN")}đ`}
                                    </Typography>
                                </InfoRow>
                                <Divider sx={{ borderStyle: "dashed" }} />
                                <InfoRow label="Hiển thị">
                                    <Chip
                                        label={typeDisplay.label}
                                        size="small"
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: "0.75rem",
                                            borderRadius: "var(--shape-borderRadius-sm)",
                                            color: typeDisplay.color,
                                            bgcolor: typeDisplay.bg,
                                        }}
                                    />
                                </InfoRow>
                                <Divider sx={{ borderStyle: "dashed" }} />
                                <InfoRow label="Ngày tạo">
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--palette-text-primary)" }}>
                                        {dayjs(coupon.createdAt).format("DD MMM, YYYY")}
                                    </Typography>
                                </InfoRow>
                            </Box>
                        </Card>

                        {/* Conditions */}
                        <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <Typography sx={{ px: 3, pt: 3, pb: 2, fontSize: "1.0625rem", fontWeight: 700, color: "var(--palette-text-primary)" }}>
                                Điều kiện áp dụng
                            </Typography>
                            <Divider sx={{ borderStyle: "dashed" }} />
                            <Box sx={{ px: 3, py: 1 }}>
                                <InfoRow label="Đơn hàng tối thiểu">
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--palette-text-primary)" }}>
                                        {coupon.minOrderValue > 0
                                            ? `${coupon.minOrderValue.toLocaleString("vi-VN")}đ`
                                            : "Không giới hạn"}
                                    </Typography>
                                </InfoRow>
                                {coupon.typeDiscount === "percentage" && (
                                    <>
                                        <Divider sx={{ borderStyle: "dashed" }} />
                                        <InfoRow label="Giảm tối đa">
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--palette-text-primary)" }}>
                                                {coupon.maxDiscountValue > 0
                                                    ? `${coupon.maxDiscountValue.toLocaleString("vi-VN")}đ`
                                                    : "Không giới hạn"}
                                            </Typography>
                                        </InfoRow>
                                    </>
                                )}
                                <Divider sx={{ borderStyle: "dashed" }} />
                                <InfoRow label="Thời gian hiệu lực">
                                    <Stack alignItems="flex-end" spacing={0.25}>
                                        {startDateStr && endDateStr ? (
                                            <>
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--palette-text-primary)" }}>
                                                    {startDateStr} → {endDateStr}
                                                </Typography>
                                            </>
                                        ) : startDateStr ? (
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--palette-text-primary)" }}>
                                                Từ {startDateStr}
                                            </Typography>
                                        ) : (
                                            <Typography variant="body2" sx={{ color: "var(--palette-text-disabled)" }}>
                                                Không giới hạn
                                            </Typography>
                                        )}
                                    </Stack>
                                </InfoRow>
                            </Box>
                        </Card>
                    </Stack>
                </Grid>

                {/* Right column */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={3}>
                        {/* Usage Card */}
                        <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <Typography sx={{ fontSize: "1.0625rem", fontWeight: 700, mb: 2.5, color: "var(--palette-text-primary)" }}>
                                Thống kê sử dụng
                            </Typography>

                            <Stack spacing={2}>
                                <Box>
                                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                                        <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)" }}>
                                            Đã dùng / Giới hạn
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--palette-text-primary)" }}>
                                            {coupon.usedCount || 0} / {coupon.usageLimit || "∞"}
                                        </Typography>
                                    </Stack>
                                    {coupon.usageLimit > 0 && (
                                        <Box sx={{ height: 8, bgcolor: "var(--palette-background-neutral)", borderRadius: 4, overflow: "hidden" }}>
                                            <Box
                                                sx={{
                                                    height: "100%",
                                                    width: `${usagePercent}%`,
                                                    bgcolor: usagePercent >= 80
                                                        ? "var(--palette-error-main)"
                                                        : "var(--palette-primary-main)",
                                                    borderRadius: 4,
                                                    transition: "width 0.6s ease",
                                                }}
                                            />
                                        </Box>
                                    )}
                                    {coupon.usageLimit > 0 && (
                                        <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)", mt: 0.5, display: "block" }}>
                                            {usagePercent}% đã sử dụng
                                        </Typography>
                                    )}
                                </Box>

                                <Divider sx={{ borderStyle: "dashed" }} />

                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)" }}>
                                        Còn lại
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--palette-primary-main)" }}>
                                        {coupon.usageLimit > 0
                                            ? Math.max(0, coupon.usageLimit - (coupon.usedCount || 0))
                                            : "Không giới hạn"}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Card>

                        {/* Quick Info */}
                        <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <Typography sx={{ fontSize: "1.0625rem", fontWeight: 700, mb: 2.5, color: "var(--palette-text-primary)" }}>
                                Thông tin nhanh
                            </Typography>

                            <Stack spacing={2}>
                                {[
                                    {
                                        icon: "solar:ticket-bold-duotone",
                                        label: "Giá trị",
                                        value: coupon.typeDiscount === "percentage"
                                            ? `Giảm ${coupon.value}%`
                                            : `Giảm ${(coupon.value || 0).toLocaleString("vi-VN")}đ`,
                                        color: "var(--palette-primary-main)",
                                        bgColor: "var(--palette-primary-lighter)",
                                    },
                                    {
                                        icon: "solar:bill-list-bold-duotone",
                                        label: "Đơn tối thiểu",
                                        value: coupon.minOrderValue > 0
                                            ? `${coupon.minOrderValue.toLocaleString("vi-VN")}đ`
                                            : "Không giới hạn",
                                        color: "var(--palette-info-main)",
                                        bgColor: "var(--palette-info-lighter)",
                                    },
                                    {
                                        icon: "solar:calendar-bold-duotone",
                                        label: "Hết hạn",
                                        value: endDateStr || "Không giới hạn",
                                        color: "var(--palette-warning-dark)",
                                        bgColor: "var(--palette-warning-lighter)",
                                    },
                                ].map((item) => (
                                    <Stack key={item.label} direction="row" spacing={1.5} alignItems="center">
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: "var(--shape-borderRadius-sm)",
                                                bgcolor: item.bgColor,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Icon icon={item.icon} width={22} color={item.color} />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)", display: "block", lineHeight: 1 }}>
                                                {item.label}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--palette-text-primary)", mt: 0.25 }}>
                                                {item.value}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                ))}
                            </Stack>
                        </Card>
                    </Stack>
                </Grid>
            </Grid>
        </>
    );
};
