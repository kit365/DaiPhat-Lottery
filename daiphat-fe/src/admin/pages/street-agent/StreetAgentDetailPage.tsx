"use client";

import { useParams } from "react-router-dom";
import {
    Avatar,
    Box,
    Card,
    Chip,
    CircularProgress,
    Grid,
    Stack,
    Typography,
} from "@mui/material";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { ROUTES } from "../../constants/routes";
import { STATUS_LABELS } from "../../features/street-agent/components/configs/constants";
import { useStreetAgentProfileDetail } from "../../features/street-agent/hooks/useStreetAgent";

const formatCurrency = (value?: number | null) => {
    if (value == null) return "—";
    return new Intl.NumberFormat("vi-VN").format(value) + " VNĐ";
};

const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
};

const formatCommission = (value?: number | null) => {
    if (value == null) return "—";
    return `${(value * 100).toFixed(2)}%`;
};

const InfoItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Stack spacing={0.5}>
        <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", fontWeight: 600 }}>
            {label}
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--palette-text-primary)", fontWeight: 500 }}>
            {value || "—"}
        </Typography>
    </Stack>
);

export const StreetAgentDetailPage = () => {
    const { id } = useParams();
    const { data: profile, isLoading } = useStreetAgentProfileDetail(id);

    if (isLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!profile) {
        return (
            <Box sx={{ py: 5, textAlign: "center" }}>
                <Typography>Không tìm thấy hồ sơ đại lý bán dạo.</Typography>
            </Box>
        );
    }

    const fullName = `${profile.lastName || ""} ${profile.firstName || ""}`.trim();
    const statusLabel = STATUS_LABELS[profile.status || ""] || profile.status || "—";

    return (
        <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
            <Box sx={{ mb: 5 }}>
                <Title title="Chi tiết đại lý bán dạo" />
                <Breadcrumb
                    items={[
                        { label: "Dashboard", to: "/" },
                        { label: "Quản lý tài khoản", to: ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST },
                        { label: "Đại lý bán dạo", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
                        { label: fullName || "Chi tiết" },
                    ]}
                />
            </Box>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card
                        sx={{
                            px: 4,
                            py: 6,
                            textAlign: "center",
                            borderRadius: "var(--shape-borderRadius-lg)",
                            boxShadow: "var(--customShadows-card)",
                        }}
                    >
                        <Avatar
                            src={profile.imageUrl}
                            alt={fullName}
                            sx={{
                                width: 120,
                                height: 120,
                                mx: "auto",
                                mb: 2,
                                fontSize: "2rem",
                                fontWeight: 700,
                                bgcolor: "rgba(145, 158, 171, 0.12)",
                                color: "var(--palette-primary-main)",
                            }}
                        >
                            {profile.lastName?.charAt(0)?.toUpperCase()}
                        </Avatar>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                            {fullName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)", mb: 2 }}>
                            {profile.cccd || "—"}
                        </Typography>
                        <Chip
                            label={statusLabel}
                            sx={{
                                bgcolor: profile.status === "ACTIVE" ? "rgba(34, 197, 94, 0.16)" : "rgba(145, 158, 171, 0.16)",
                                color: profile.status === "ACTIVE" ? "rgb(17, 141, 87)" : "var(--palette-text-secondary)",
                                fontWeight: 700,
                            }}
                        />
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                    <Stack spacing={3}>
                        <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3 }}>
                                Thông tin cá nhân
                            </Typography>
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                                <InfoItem label="Họ" value={profile.lastName} />
                                <InfoItem label="Tên" value={profile.firstName} />
                                <InfoItem label="Số điện thoại" value={profile.phone} />
                                <InfoItem label="Số CCCD" value={profile.cccd} />
                            </Box>
                        </Card>

                        <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3 }}>
                                Thông tin liên hệ
                            </Typography>
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                                <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                                    <InfoItem label="Địa chỉ hoạt động" value={profile.contactAddress} />
                                </Box>
                                <InfoItem label="Tỉnh/thành" value={profile.contactProvince} />
                                <InfoItem label="Địa bàn bán" value={profile.coverageArea} />
                            </Box>
                        </Card>

                        <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3 }}>
                                Thông tin hợp đồng
                            </Typography>
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                                <InfoItem label="Tỷ lệ hoa hồng" value={formatCommission(profile.commissionRate)} />
                                <InfoItem label="Số dư ký quỹ" value={formatCurrency(profile.depositBalance)} />
                                <InfoItem label="Ngày bắt đầu hợp đồng" value={formatDate(profile.contractStartDate)} />
                                <InfoItem label="Ngày kết thúc hợp đồng" value={formatDate(profile.contractEndDate)} />
                            </Box>
                        </Card>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};
