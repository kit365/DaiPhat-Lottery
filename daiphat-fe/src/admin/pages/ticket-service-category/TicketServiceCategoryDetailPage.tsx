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
import { useNavigate, useParams, Link } from "react-router-dom";
import dayjs from "dayjs";
import { useTicketServiceCategoryDetail, useUpdateTicketServiceCategory } from "./hooks/useTicketServiceCategory";
import { useTicketServices } from "../ticket-service/hooks/useTicketService";
import { toast } from "react-toastify";
import { prefixAdmin } from "../../constants/routes";
import { confirmAction } from "../../utils/swal";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: "Đang hoạt động", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
    inactive: { label: "Tạm ẩn", color: "var(--palette-text-disabled)", bg: "var(--palette-background-neutral)" },
};

const REGIONAL_TYPE_MAP: Record<string, string> = {
    XSMN: "Miền Nam",
    XSMB: "Miền Bắc",
    XSMT: "Miền Trung",
};

export const TicketServiceCategoryDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: category, isLoading } = useTicketServiceCategoryDetail(id);
    const { mutate: update } = useUpdateTicketServiceCategory();

    // Lấy danh sách dịch vụ thuộc danh mục này
    const { data: ticketServicesRes } = useTicketServices({ categoryId: id, limit: 100 });
    const ticketServices = ticketServicesRes?.data?.recordList || [];

    if (isLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 20 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!category) {
        return (
            <Box sx={{ p: 5, textAlign: "center" }}>
                <Typography>Không tìm thấy danh mục</Typography>
            </Box>
        );
    }

    const currentStatus = STATUS_MAP[category.status] || STATUS_MAP.inactive;

    const handleStatusChange = (newStatus: string) => {
        const executeUpdate = () => {
            update(
                { id: id as string, data: { status: newStatus } },
                {
                    onSuccess: (res) => {
                        if (res.code === 200 || res.success) {
                            toast.success("Cập nhật trạng thái thành công");
                        } else {
                            toast.error(res.message || "Cập nhật thất bại");
                        }
                    }
                }
            );
        };

        if (newStatus === "inactive") {
            confirmAction(
                "Xác nhận tạm ẩn?",
                "Nếu bạn tạm ẩn danh mục này, tất cả các dịch vụ thuộc danh mục này cũng sẽ bị tạm ẩn. Bạn có chắc chắn?",
                executeUpdate,
                "warning"
            );
        } else {
            executeUpdate();
        }
    };

    return (
        <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
            {/* Header */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, mt: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                    <IconButton
                        onClick={() => navigate(`/${prefixAdmin}/ticketService/categories`)}
                        sx={{ color: "var(--palette-action-active)", p: 0.75, mr: 1, mt: 0.25 }}
                    >
                        <Icon icon="eva:arrow-ios-back-fill" width={20} />
                    </IconButton>

                    <Stack spacing={0.5}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="h4" sx={{ fontSize: "1.5rem", fontWeight: 700 }}>
                                {category.name}
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
                            Tạo lúc {dayjs(category.createdAt).format("DD MMM YYYY h:mm a")}
                        </Typography>
                    </Stack>
                </Box>

                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Select
                        size="small"
                        value={category.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        sx={{
                            minWidth: 150,
                            height: 36,
                            borderRadius: "8px",
                            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                            "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: (theme) => alpha(theme.palette.grey[500], 0.32),
                            },
                        }}
                        IconComponent={(props) => <Icon icon="eva:chevron-down-fill" {...props} width={20} />}
                    >
                        {Object.entries(STATUS_MAP).map(([val, opt]) => (
                            <MenuItem key={val} value={val} sx={{ fontSize: "0.875rem" }}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>

                    <Button
                        variant="contained"
                        startIcon={<Icon icon="solar:pen-bold" />}
                        onClick={() => navigate(`/${prefixAdmin}/ticketService/categories/edit/${id}`)}
                        sx={{
                            height: 36,
                            fontWeight: 700,
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
                <Grid size={{ xs: 12, md: 8 }}>
                    <Stack spacing={3}>
                        {/* Thông tin danh mục */}
                        <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 3, pb: 2 }}>
                                <Avatar
                                    src={category.avatar}
                                    variant="rounded"
                                    sx={{ width: 72, height: 72, bgcolor: "var(--palette-primary-lighter)" }}
                                >
                                    <Icon icon="solar:folder-with-files-bold-duotone" width={36} color="var(--palette-primary-main)" />
                                </Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{category.name}</Typography>
                                    <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)", mt: 0.5 }}>
                                        Slug: {category.slug || "—"}
                                    </Typography>
                                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
                                        {(category.userTicketTypes || []).map((pt: string) => (
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

                            <Box sx={{ p: 3 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, color: "var(--palette-text-secondary)" }}>
                                    Mô tả
                                </Typography>
                                {category.description ? (
                                    <Box
                                        dangerouslySetInnerHTML={{ __html: category.description }}
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
                            </Box>
                        </Card>

                        {/* Danh sách dịch vụ thuộc danh mục */}
                        <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)", p: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                                <Typography sx={{ fontSize: "1.125rem", fontWeight: 600 }}>Dịch vụ thuộc danh mục</Typography>
                                <Button
                                    component={Link}
                                    to={`/${prefixAdmin}/ticketService/create?categoryId=${id}`}
                                    variant="outlined"
                                    size="small"
                                    startIcon={<Icon icon="solar:add-circle-bold" />}
                                >
                                    Thêm dịch vụ
                                </Button>
                            </Stack>

                            {ticketServices.length > 0 ? (
                                <Stack spacing={1}>
                                    {ticketServices.map((ticketService: any) => (
                                        <Stack
                                            key={ticketService._id}
                                            direction="row"
                                            justifyContent="space-between"
                                            alignItems="center"
                                            component={Link}
                                            to={`/${prefixAdmin}/ticketService/detail/${ticketService._id}`}
                                            sx={{
                                                px: 2,
                                                py: 1.5,
                                                borderRadius: "var(--shape-borderRadius-md)",
                                                border: "1px solid var(--palette-divider)",
                                                textDecoration: "none",
                                                transition: "all 0.2s",
                                                "&:hover": {
                                                    bgcolor: "var(--palette-background-neutral)",
                                                    borderColor: "var(--palette-primary-main)",
                                                }
                                            }}
                                        >
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Avatar src={ticketService.images?.[0]} variant="rounded" sx={{ width: 40, height: 40 }} />
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ color: "var(--palette-text-primary)" }}>
                                                        {ticketService.name}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)" }}>
                                                        {ticketService.duration} phút
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <Typography variant="subtitle2" sx={{ color: "var(--palette-primary-main)", fontWeight: 700 }}>
                                                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(ticketService.basePrice || 0)}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            ) : (
                                <Box sx={{ py: 4, textAlign: "center", bgcolor: "var(--palette-background-neutral)", borderRadius: 1 }}>
                                    <Typography variant="body2" sx={{ color: "var(--palette-text-disabled)" }}>
                                        Chưa có dịch vụ nào trong danh mục này
                                    </Typography>
                                </Box>
                            )}
                        </Card>
                    </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={3}>
                        {/* Thông tin bổ sung */}
                        <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, mb: 2 }}>Thông tin hệ thống</Typography>
                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)", display: "block" }}>
                                        Danh mục cha
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {category.parentId?.name || "Gốc (Root)"}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)", display: "block" }}>
                                        Ngày tạo
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {dayjs(category.createdAt).format("DD MMM YYYY h:mm a")}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)", display: "block" }}>
                                        Cập nhật lần cuối
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {dayjs(category.updatedAt).format("DD MMM YYYY h:mm a")}
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
