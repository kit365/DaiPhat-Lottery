import {
    Box,
    Card,
    Stack,
    Grid,
    Avatar,
    Typography,
    Button,
    Chip,
    IconButton,
    CircularProgress,
    Divider,
    alpha,
    Select,
    MenuItem,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { useTicketServiceDetail, useUpdateTicketService } from "./hooks/useTicketService";
import { toast } from "react-toastify";
import { prefixAdmin } from "../../constants/routes";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: "Đang hoạt động", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
    inactive: { label: "Tạm ẩn", color: "var(--palette-text-disabled)", bg: "var(--palette-background-neutral)" },
};

const PRICING_TYPE_MAP: Record<string, string> = {
    fixed: "Giá cố định",
    "by-weight": "Theo số lượng",
};

const REGIONAL_TYPE_MAP: Record<string, string> = {
    XSMN: "Miền Nam",
    XSMB: "Miền Bắc",
    XSMT: "Miền Trung",
};

const fmt = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price || 0);

export const TicketServiceDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: ticketService, isLoading } = useTicketServiceDetail(id);
    const { mutate: update } = useUpdateTicketService();

    if (isLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 20 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!ticketService) {
        return (
            <Box sx={{ p: 5, textAlign: "center" }}>
                <Typography>Không tìm thấy dịch vụ</Typography>
            </Box>
        );
    }

    const currentStatus = STATUS_MAP[ticketService.status] || STATUS_MAP.inactive;

    const handleStatusChange = (newStatus: string) => {
        update(
            { id: ticketService._id, data: { status: newStatus } },
            { onSuccess: () => toast.success("Cập nhật trạng thái thành công") }
        );
    };

    return (
        <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
            {/* Header */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, mt: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                    <IconButton
                        onClick={() => navigate(`/${prefixAdmin}/ticketService/list`)}
                        sx={{ color: "var(--palette-action-active)", p: 0.75, mr: 1, mt: 0.25 }}
                    >
                        <Icon icon="eva:arrow-ios-back-fill" width={20} />
                    </IconButton>

                    <Stack spacing={0.5}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="h4" sx={{ fontSize: "1.5rem", fontWeight: 700 }}>
                                {ticketService.name}
                            </Typography>
                            <Chip
                                label={currentStatus.label}
                                size="small"
                                sx={{
                                    fontWeight: 700,
                                    height: 22,
                                    fontSize: "0.75rem",
                                    borderRadius: "var(--shape-borderRadius-sm)",
                                    color: currentStatus.color,
                                    bgcolor: currentStatus.bg,
                                    backgroundImage: "linear-gradient(rgba(255,255,255,0.48),rgba(255,255,255,0.48))",
                                }}
                            />
                        </Box>
                        <Typography variant="body2" sx={{ color: "var(--palette-text-disabled)" }}>
                            Tạo lúc {dayjs(ticketService.createdAt).format("DD MMM YYYY h:mm a")}
                        </Typography>
                    </Stack>
                </Box>

                <Stack direction="row" spacing={1.5} alignItems="center">
                    {/* Status selector */}
                    <Select
                        size="small"
                        value={ticketService.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        sx={{
                            minWidth: 150,
                            height: 36,
                            borderRadius: "8px",
                            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                            "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: (theme) => alpha(theme.palette.grey[500], 0.32),
                            },
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                                borderColor: "var(--palette-text-primary)",
                            },
                            "& .MuiSelect-select": {
                                pr: "28px !important",
                                pl: "12px !important",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                color: "var(--palette-text-primary)",
                                display: "flex",
                                alignItems: "center",
                                height: "100%",
                                py: 0,
                            },
                            "& .MuiSelect-icon": {
                                width: 18,
                                height: 18,
                                color: "var(--palette-text-primary)",
                                top: "calc(50% - 9px)",
                                right: 6,
                            },
                        }}
                        IconComponent={(props) => <Icon icon="eva:chevron-down-fill" {...props} width={20} />}
                        MenuProps={{
                            PaperProps: {
                                className: "background-popup",
                                sx: { px: 0, width: 150, boxShadow: "var(--customShadows-z20)", borderRadius: "8px", mt: 0.5, p: 0.5 },
                            },
                        }}
                    >
                        {Object.entries(STATUS_MAP).map(([val, opt]) => (
                            <MenuItem
                                key={val}
                                value={val}
                                sx={{
                                    fontSize: "0.875rem",
                                    borderRadius: "6px",
                                    px: 1,
                                    py: 0.5,
                                    my: 0.25,
                                    "&.Mui-selected": {
                                        fontWeight: "600 !important",
                                        bgcolor: "var(--palette-action-selected) !important",
                                    },
                                }}
                            >
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>

                    <Button
                        variant="contained"
                        startIcon={<Icon icon="solar:pen-bold" />}
                        onClick={() => navigate(`/${prefixAdmin}/ticketService/edit/${id}`)}
                        sx={{
                            height: 36,
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            textTransform: "capitalize",
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
                {/* LEFT: main info */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Stack spacing={3}>
                        {/* Thông tin dịch vụ */}
                        <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 3, pb: 2 }}>
                                <Avatar
                                    src={ticketService.thumbnail || ticketService.image}
                                    variant="rounded"
                                    sx={{ width: 72, height: 72, bgcolor: "var(--palette-primary-lighter)" }}
                                >
                                    <Icon icon="solar:confetti-minimalistic-bold-duotone" width={36} color="var(--palette-primary-main)" />
                                </Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{ticketService.name}</Typography>
                                    <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)", mt: 0.5 }}>
                                        {ticketService.categoryId?.name || "Chưa phân danh mục"}
                                    </Typography>
                                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
                                        {(ticketService.userTicketTypes || []).map((pt: string) => (
                                            <Chip
                                                key={pt}
                                                label={REGIONAL_TYPE_MAP[pt] || pt}
                                                size="small"
                                                icon={<Icon icon="solar:globus-bold" width={14} />}
                                                sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            </Stack>

                            <Divider sx={{ borderStyle: "dashed" }} />

                            {/* Attrs grid */}
                            <Box sx={{ p: 3 }}>
                                <Grid container spacing={2.5}>
                                    {[
                                        { label: "Thời lượng", value: `${ticketService.duration || 0} phút`, icon: "solar:clock-circle-bold-duotone" },
                                        { label: "Thời lượng tối thiểu", value: `${ticketService.minDuration || 0} phút`, icon: "solar:clock-square-bold-duotone" },
                                        { label: "Thời lượng tối đa", value: `${ticketService.maxDuration || 0} phút`, icon: "solar:alarm-bold-duotone" },
                                        { label: "Loại giá", value: PRICING_TYPE_MAP[ticketService.pricingType] || ticketService.pricingType, icon: "solar:tag-price-bold-duotone" },
                                        { label: "Slug", value: ticketService.slug || "—", icon: "solar:link-bold-duotone" },
                                    ].map((item) => (
                                        <Grid key={item.label} size={{ xs: 12, sm: 6 }}>
                                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                                <Box
                                                    sx={{
                                                        mt: 0.25,
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 1,
                                                        bgcolor: "var(--palette-background-neutral)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <Icon icon={item.icon} width={20} color="var(--palette-text-secondary)" />
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)", display: "block" }}>
                                                        {item.label}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {item.value}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        </Card>

                        {/* Bảng giá */}
                        <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)", p: 3 }}>
                            <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, mb: 2.5 }}>Bảng giá</Typography>
                            {ticketService.pricingType === "fixed" ? (
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    sx={{
                                        p: 2,
                                        borderRadius: "var(--shape-borderRadius-md)",
                                        bgcolor: "var(--palette-background-neutral)",
                                    }}
                                >
                                    <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)" }}>
                                        Giá cố định
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--palette-success-dark)" }}>
                                        {fmt(ticketService.basePrice)}
                                    </Typography>
                                </Stack>
                            ) : (
                                <Stack spacing={1}>
                                    {(ticketService.priceList || []).map((item: { label: string; value: number }, idx: number) => (
                                        <Stack
                                            key={idx}
                                            direction="row"
                                            justifyContent="space-between"
                                            alignItems="center"
                                            sx={{
                                                px: 2,
                                                py: 1.5,
                                                borderRadius: "var(--shape-borderRadius-md)",
                                                bgcolor: idx % 2 === 0 ? "var(--palette-background-neutral)" : "transparent",
                                                border: "1px solid var(--palette-divider)",
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#00A76F" }}>
                                                {ticketService.pricingType === 'by-weight' && item.label ? (
                                                    idx === 0 ? `< ${item.label} vé` : `${ticketService.priceList[idx - 1]?.label} -> ${item.label} vé`
                                                ) : (item.label || `Mức ${idx + 1}`)}
                                            </Typography>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#00A76F" }}>
                                                {fmt(item.value)}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            )}
                        </Card>
                    </Stack>
                </Grid>

                {/* RIGHT: sidebar cards */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={3}>
                        {/* Mô tả */}
                        <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, mb: 2 }}>Mô tả</Typography>
                            {ticketService.description ? (
                                <Box
                                    dangerouslySetInnerHTML={{ __html: ticketService.description }}
                                    sx={{
                                        fontSize: "0.875rem",
                                        color: "var(--palette-text-secondary)",
                                        lineHeight: 1.8,
                                        "& p": { m: 0 },
                                    }}
                                />
                            ) : (
                                <Typography variant="body2" sx={{ color: "var(--palette-text-disabled)", fontStyle: "italic" }}>
                                    Chưa có mô tả
                                </Typography>
                            )}
                        </Card>

                        {/* Quy trình */}
                        <Card sx={{ p: 3, mt: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, mb: 2 }}>Quy trình thực hiện</Typography>
                            {ticketService.procedure ? (
                                <Box
                                    dangerouslySetInnerHTML={{ __html: ticketService.procedure }}
                                    sx={{
                                        fontSize: "0.875rem",
                                        color: "var(--palette-text-secondary)",
                                        lineHeight: 1.8,
                                        "& p": { m: 0 },
                                    }}
                                />
                            ) : (
                                <Typography variant="body2" sx={{ color: "var(--palette-text-disabled)", fontStyle: "italic" }}>
                                    Chưa có quy trình chi tiết
                                </Typography>
                            )}
                        </Card>

                        {/* Thời gian */}
                        <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, mb: 2 }}>Thông tin thời gian</Typography>
                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)", display: "block" }}>
                                        Ngày tạo
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {dayjs(ticketService.createdAt).format("DD MMM YYYY h:mm a")}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)", display: "block" }}>
                                        Cập nhật lần cuối
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {dayjs(ticketService.updatedAt).format("DD MMM YYYY h:mm a")}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Card>

                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};
