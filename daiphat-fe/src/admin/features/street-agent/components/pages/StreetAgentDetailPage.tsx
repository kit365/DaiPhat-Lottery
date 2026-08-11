"use client";

import { useRouteParams } from "@/hooks/useRouteParams";
import {
    Avatar,
    Box,
    Card,
    Chip,
    CircularProgress,
    Grid,
    Stack,
    Tab,
    Tabs,
    Typography,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { PageHeader } from "@/admin/components/ui/PageHeader";
import { SpinnerLoading } from "@/admin/components/ui/SpinnerLoading";
import { Button } from "@/admin/components/ui/Button";
import { ROUTES } from "@/admin/constants/routes";
import { STATUS_LABELS } from "../configs/constants";
import {
    useStreetAgentProfileDetail,
    useUploadStreetAgentSignedContract,
} from "../../hooks/useStreetAgent";
import { openStreetAgentContractPrint } from "../../services/streetAgentService";
import { SignedContractUploadDialog } from "../SignedContractUploadDialog";
import { ContractDocumentViewerDialog } from "../ContractDocumentViewerDialog";
import {
    StreetAgentConfidencePanel,
    StreetAgentDailySalesReportsPanel,
} from "../sections/StreetAgentConfidenceAndReports";
import { formatCoverageAreaDisplay } from "../../constants/coverageAreas";
import { STREET_AGENT_PHASE_UI } from "../../constants/featureFlags";
import {
    formatCommission,
    formatConfidencePoints,
    formatDate,
    formatVnd,
} from "../../utils/format";

const SIGNED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const SIGNED_DOC_MAX_SIZE = 10 * 1024 * 1024;

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

const SectionHeader = ({
    title,
    badge,
    tone = "phase",
}: {
    title: string;
    badge?: string;
    tone?: "phase" | "readonly";
}) => (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
        </Typography>
        {badge && (tone === "readonly" || STREET_AGENT_PHASE_UI.enabled) ? (
            <Chip
                label={badge}
                size="small"
                sx={{
                    height: 22,
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    bgcolor: tone === "readonly" ? "rgba(145, 158, 171, 0.16)" : "rgba(0, 167, 111, 0.12)",
                    color: tone === "readonly" ? "var(--palette-text-secondary)" : "rgb(0, 120, 80)",
                }}
            />
        ) : null}
    </Stack>
);

export const StreetAgentDetailPage = () => {
    const { id } = useRouteParams();
    const { data: profile, isLoading, refetch } = useStreetAgentProfileDetail(id);
    const { mutate: uploadSigned, isPending: isUploadingSigned } = useUploadStreetAgentSignedContract();
    const signedFileInputRef = useRef<HTMLInputElement>(null);
    const [pendingSignedFile, setPendingSignedFile] = useState<File | null>(null);
    const [viewSignedOpen, setViewSignedOpen] = useState(false);
    const [detailTab, setDetailTab] = useState(0);

    const handleSelectSignedDocument = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !id) return;

        if (!SIGNED_DOC_TYPES.includes(file.type)) {
            toast.error("Chỉ chấp nhận PDF, JPG hoặc PNG");
            return;
        }
        if (file.size > SIGNED_DOC_MAX_SIZE) {
            toast.error("Dung lượng file quá lớn. Tối đa là 10 Mb");
            return;
        }

        setPendingSignedFile(file);
    };

    const handleConfirmSignedUpload = (file: File) => {
        if (!id) return;
        uploadSigned(
            { id, file },
            {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success(response.message || "Đính kèm bản đã ký thành công!");
                        setPendingSignedFile(null);
                        void refetch();
                    } else {
                        toast.error(response.message || "Đính kèm bản đã ký thất bại");
                    }
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.message || "Đính kèm bản đã ký thất bại");
                },
            }
        );
    };

    if (isLoading) {
        return (
            <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
                <PageHeader
                    title="Chi tiết người bán vé số"
                    breadcrumbItems={[
                        { label: "Dashboard", to: "/" },
                        { label: "Quản lý tài khoản", to: ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST },
                        { label: "Người bán vé số", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
                        { label: `#${id}` },
                    ]}
                />
                <SpinnerLoading />
            </Box>
        );
    }

    if (!profile) {
        return (
            <Box sx={{ py: 5, textAlign: "center" }}>
                <Typography>Không tìm thấy hồ sơ người bán vé số.</Typography>
            </Box>
        );
    }

    const fullName = `${profile.lastName || ""} ${profile.firstName || ""}`.trim();
    const statusLabel = STATUS_LABELS[profile.status || ""] || profile.status || "—";

    return (
        <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
            <PageHeader
                title="Chi tiết người bán vé số"
                breadcrumbItems={[
                    { label: "Dashboard", to: "/" },
                    { label: "Quản lý tài khoản", to: ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST },
                    { label: "Người bán vé số", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
                    { label: fullName || "Chi tiết" },
                ]}
            />

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
                                bgcolor:
                                    profile.status === "ACTIVE"
                                        ? "rgba(34, 197, 94, 0.16)"
                                        : profile.status === "PENDING"
                                          ? "rgba(255, 171, 0, 0.16)"
                                          : "rgba(145, 158, 171, 0.16)",
                                color:
                                    profile.status === "ACTIVE"
                                        ? "rgb(17, 141, 87)"
                                        : profile.status === "PENDING"
                                          ? "rgb(183, 110, 0)"
                                          : "var(--palette-text-secondary)",
                                fontWeight: 700,
                            }}
                        />
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                    <Stack spacing={3}>
                        <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <SectionHeader title="Thông tin cá nhân" />
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                                <InfoItem label="Họ" value={profile.lastName} />
                                <InfoItem label="Tên" value={profile.firstName} />
                                <InfoItem label="Số điện thoại" value={profile.phone} />
                                <InfoItem label="Số CCCD" value={profile.cccd} />
                            </Box>
                        </Card>

                        <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <SectionHeader title="Thông tin liên hệ" />
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                                <InfoItem label="Tỉnh/thành" value={profile.contactProvince} />
                                <InfoItem label="Phường/xã" value={profile.contactWard} />
                                <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                                    <InfoItem label="Địa chỉ chi tiết" value={profile.contactAddress} />
                                </Box>
                            </Box>
                        </Card>

                        <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <SectionHeader title="Điều kiện nhận vé" />
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                                <InfoItem label="Ngày bắt đầu hợp đồng" value={formatDate(profile.contractStartDate)} />
                                <InfoItem label="Ngày kết thúc hợp đồng" value={formatDate(profile.contractEndDate)} />
                                <InfoItem label="Hạn mức theo hợp đồng" value={profile.contractMaxDailyCap != null ? `${profile.contractMaxDailyCap} vé/ngày` : "—"} />
                                <InfoItem label="Hạn mức giao thực tế" value={profile.effectiveDailyCap != null ? `${profile.effectiveDailyCap} vé/ngày` : "—"} />
                                <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                                    <InfoItem label="Địa bàn bán" value={formatCoverageAreaDisplay(profile.coverageArea)} />
                                </Box>
                            </Box>
                        </Card>

                        <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <SectionHeader title="Điểm tin cậy" />
                            {id ? <StreetAgentConfidencePanel profileId={id} /> : null}
                            <Box sx={{ mt: 2 }}>
                                <InfoItem
                                    label="Snapshot trên hồ sơ"
                                    value={formatConfidencePoints(
                                        profile.confidenceScore,
                                        profile.confidenceTier
                                    )}
                                />
                            </Box>
                        </Card>

                        <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <Tabs
                                value={detailTab}
                                onChange={(_e, value) => setDetailTab(value)}
                                sx={{ mb: 2 }}
                            >
                                <Tab label="Hồ sơ & hợp đồng" />
                                <Tab label="Báo cáo bán hàng" />
                            </Tabs>

                            {detailTab === 1 ? (
                                id ? <StreetAgentDailySalesReportsPanel profileId={id} /> : null
                            ) : (
                                <Stack spacing={3}>
                                    <Box>
                                        <SectionHeader title="Thông tin hệ thống" badge="Read-only" tone="readonly" />
                                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                                            <InfoItem label="Mã hợp đồng" value={profile.contractCode} />
                                            <InfoItem label="Cọc đang giữ" value={formatVnd(profile.depositBalance ?? 0)} />
                                            <Stack spacing={0.5}>
                                                <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", fontWeight: 600 }}>
                                                    Trạng thái
                                                </Typography>
                                                <Box>
                                                    <Chip label={statusLabel} sx={{ fontWeight: 700 }} />
                                                </Box>
                                            </Stack>
                                            <Button
                                                variant="outlined"
                                                startIcon={<CloudUploadIcon />}
                                                onClick={() => signedFileInputRef.current?.click()}
                                                loading={isUploadingSigned}
                                                label="Tải lên bản thay thế"
                                                loadingLabel="Đang tải..."
                                            />
                                        </Box>
                                    </Box>

                                    <Box>
                                        <SectionHeader title="Hợp đồng" />
                                        <Stack spacing={4} sx={{ mt: 2 }}>
                                            <Box>
                                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                                                    <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "var(--palette-primary-main, #00A76F)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                                                        1
                                                    </Box>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                        In hợp đồng bản cứng
                                                    </Typography>
                                                </Stack>
                                                <Box sx={{ p: 2.5, border: "1px solid var(--palette-divider, #e0e0e0)", borderRadius: 2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, bgcolor: "var(--palette-background-neutral, #f4f6f8)" }}>
                                                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 200 }}>
                                                        In file PDF hợp đồng và đưa cho người bán vé số ký xác nhận.
                                                    </Typography>
                                                    <Button
                                                        variant="contained"
                                                        color="inherit"
                                                        startIcon={<PictureAsPdfIcon />}
                                                        onClick={async () => {
                                                            if (!id) return;
                                                            try {
                                                                await openStreetAgentContractPrint(id);
                                                            } catch (error: any) {
                                                                toast.error(
                                                                    error?.message ||
                                                                        error?.response?.data?.message ||
                                                                        "Không mở được hợp đồng PDF"
                                                                );
                                                            }
                                                        }}
                                                        disabled={!profile.contractCode}
                                                        label="Xem / In hợp đồng"
                                                        sx={{ fontWeight: 700, borderRadius: "8px", boxShadow: "none" }}
                                                    />
                                                </Box>
                                            </Box>

                                            <Box>
                                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                                                    <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "var(--palette-primary-main, #00A76F)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                                                        2
                                                    </Box>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                        Tải lên bản đã ký
                                                    </Typography>
                                                </Stack>

                                                {profile.contractDocumentUrl ? (
                                                    <Box sx={{ p: 3, bgcolor: "var(--palette-background-neutral, #f4f6f8)", borderRadius: 2, border: "1px dashed var(--palette-divider, #e0e0e0)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
                                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                                            <CheckCircleIcon color="success" />
                                                            <Box>
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Đã tải lên tệp đính kèm</Typography>
                                                                <Button
                                                                    variant="text"
                                                                    onClick={() => setViewSignedOpen(true)}
                                                                    sx={{ fontWeight: 600, fontSize: "0.875rem", px: 0, justifyContent: "flex-start" }}
                                                                >
                                                                    Xem bản hợp đồng đã ký
                                                                </Button>
                                                            </Box>
                                                        </Stack>
                                                        <Button
                                                            variant="outlined"
                                                            startIcon={<CloudUploadIcon />}
                                                            onClick={() => signedFileInputRef.current?.click()}
                                                            loading={isUploadingSigned}
                                                            label="Tải lên bản thay thế"
                                                            loadingLabel="Đang tải..."
                                                        />
                                                    </Box>
                                                ) : (
                                                    <Box
                                                        onClick={() => !isUploadingSigned && signedFileInputRef.current?.click()}
                                                        sx={{
                                                            width: "100%",
                                                            border: "2px dashed var(--palette-divider, #e0e0e0)",
                                                            borderRadius: 2,
                                                            p: 5,
                                                            bgcolor: "var(--palette-background-neutral, #f4f6f8)",
                                                            cursor: isUploadingSigned ? "default" : "pointer",
                                                            transition: "all 0.2s",
                                                            textAlign: "center",
                                                            "&:hover": {
                                                                bgcolor: isUploadingSigned ? "var(--palette-background-neutral)" : "var(--palette-action-hover, rgba(99, 115, 129, 0.08))",
                                                                borderColor: "var(--palette-text-primary, #212B36)"
                                                            }
                                                        }}
                                                    >
                                                        {isUploadingSigned ? (
                                                            <Stack spacing={2} alignItems="center">
                                                                <CircularProgress size={32} thickness={4} sx={{ color: "var(--palette-text-primary)" }} />
                                                                <Typography variant="subtitle2">Đang tải lên bản đã ký...</Typography>
                                                            </Stack>
                                                        ) : (
                                                            <Stack spacing={2} alignItems="center">
                                                                <Box sx={{
                                                                    width: 64, height: 64, borderRadius: "50%",
                                                                    bgcolor: "var(--palette-primary-lighter, #FFE7D9)",
                                                                    color: "var(--palette-primary-dark, #B72136)",
                                                                    display: "flex", alignItems: "center", justifyContent: "center"
                                                                }}>
                                                                    <CloudUploadIcon fontSize="large" />
                                                                </Box>
                                                                <Box>
                                                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                                                                        Kéo thả hoặc nhấn để tải lên bản đã ký
                                                                    </Typography>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        Hỗ trợ định dạng: PDF, JPG, PNG. Tối đa 10MB.
                                                                    </Typography>
                                                                </Box>
                                                            </Stack>
                                                        )}
                                                    </Box>
                                                )}
                                                <input
                                                    type="file"
                                                    ref={signedFileInputRef}
                                                    onChange={handleSelectSignedDocument}
                                                    className="hidden"
                                                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                                />
                                            </Box>
                                        </Stack>
                                    </Box>
                                </Stack>
                            )}
                        </Card>
                    </Stack>
                </Grid>
            </Grid>

            <SignedContractUploadDialog
                open={!!pendingSignedFile}
                file={pendingSignedFile}
                uploading={isUploadingSigned}
                onClose={() => {
                    if (!isUploadingSigned) setPendingSignedFile(null);
                }}
                onConfirm={handleConfirmSignedUpload}
            />

            <ContractDocumentViewerDialog
                open={viewSignedOpen}
                url={profile.contractDocumentUrl}
                fileName={profile.contractCode ? `Hop-dong-da-ky-${profile.contractCode}` : undefined}
                onClose={() => setViewSignedOpen(false)}
            />
        </Box>
    );
};
