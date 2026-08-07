"use client";

import { Control, Controller } from "react-hook-form";
import {
    Autocomplete,
    Box,
    Button,
    Card,
    Chip,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { REGION_DATA } from "../../../../constants/region.constants";
import { STATUS_LABELS } from "../configs/constants";
import { CreateStreetAgentProfileFormValues } from "../../schemas/street-agent.schema";
import {
    COVERAGE_AREA_OPTIONS,
    CoverageAreaOption,
} from "../../constants/coverageAreas";
import { STREET_AGENT_PHASE_UI } from "../../constants/featureFlags";
import {
    VendorSettingsDefaults,
    VENDOR_LATE_RETURN_POLICY_LABELS,
} from "../../hooks/useVendorSettingsDefaults";
import { formatConfidencePoints, formatCurrency, formatVnd } from "../../utils/format";

const PROVINCE_OPTIONS = Array.from(new Set(Object.values(REGION_DATA).flat())).sort((a, b) =>
    a.localeCompare(b, "vi")
);

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "var(--shape-borderRadius)",
        fontSize: "0.875rem",
    },
};

type StreetAgentFormValues = CreateStreetAgentProfileFormValues;

interface StreetAgentProfileFormProps {
    control: Control<StreetAgentFormValues> | Control<any>;
    imageUrl?: string | null;
    isUploading: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onOpenFile: () => void;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    mode?: "create" | "edit";
    contractCode?: string | null;
    contractDocumentUrl?: string | null;
    depositBalance?: number | null;
    statusChip?: string;
    confidenceScore?: number | null;
    confidenceTier?: string | null;
    onPrintContract?: () => void;
    onUploadSignedDocument?: (file: File) => void;
    onViewSignedDocument?: () => void;
    isUploadingSignedDocument?: boolean;
    signedFileInputRef?: React.RefObject<HTMLInputElement | null>;
    onAdjustDeposit?: () => void;
    onLockProfile?: () => void;
    onReactivateProfile?: () => void;
    isStatusActionPending?: boolean;
    vendorDefaults?: VendorSettingsDefaults | null;
    footer: React.ReactNode;
}

const PhaseBadge = ({ label, tone = "phase" }: { label: string; tone?: "phase" | "readonly" }) => {
    if (tone === "phase" && !STREET_AGENT_PHASE_UI.enabled) return null;
    return (
        <Chip
            label={label}
            size="small"
            sx={{
                height: 22,
                fontWeight: 700,
                fontSize: "0.7rem",
                bgcolor: tone === "readonly" ? "rgba(145, 158, 171, 0.16)" : "rgba(0, 167, 111, 0.12)",
                color: tone === "readonly" ? "var(--palette-text-secondary)" : "rgb(0, 120, 80)",
            }}
        />
    );
};

const SectionTitle = ({
    title,
    badge,
    badgeTone = "phase",
}: {
    title: string;
    badge?: string;
    badgeTone?: "phase" | "readonly";
}) => (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
        </Typography>
        {badge ? <PhaseBadge label={badge} tone={badgeTone} /> : null}
    </Stack>
);

const ReadOnlyRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Stack spacing={0.5}>
        <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", fontWeight: 600 }}>
            {label}
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--palette-text-primary)", fontWeight: 600 }}>
            {value}
        </Typography>
    </Stack>
);

const LockedOverlay = ({ phaseLabel }: { phaseLabel: string }) => (
    <Box
        sx={{
            mt: 2,
            p: 2,
            borderRadius: "var(--shape-borderRadius)",
            bgcolor: "rgba(145, 158, 171, 0.08)",
            border: "1px dashed rgba(145, 158, 171, 0.32)",
            opacity: 0.9,
        }}
    >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <LockOutlinedIcon sx={{ fontSize: 18, color: "var(--palette-text-secondary)" }} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--palette-text-secondary)" }}>
                Đang khóa
            </Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)" }}>
            Tính năng đang được hoàn thiện trong {phaseLabel}.
        </Typography>
    </Box>
);

const getStatusChipStyle = (status?: string) => {
    if (status === "ACTIVE") {
        return { bgcolor: "rgba(34, 197, 94, 0.16)", color: "rgb(17, 141, 87)" };
    }
    if (status === "PENDING") {
        return { bgcolor: "rgba(255, 171, 0, 0.16)", color: "rgb(183, 110, 0)" };
    }
    return { bgcolor: "rgba(145, 158, 171, 0.16)", color: "var(--palette-text-secondary)" };
};

export const StreetAgentProfileForm = ({
    control,
    imageUrl,
    isUploading,
    fileInputRef,
    onOpenFile,
    onFileChange,
    mode = "create",
    contractCode,
    contractDocumentUrl,
    depositBalance,
    statusChip,
    confidenceScore,
    confidenceTier,
    onPrintContract,
    onUploadSignedDocument,
    onViewSignedDocument,
    isUploadingSignedDocument = false,
    signedFileInputRef,
    onAdjustDeposit,
    onLockProfile,
    onReactivateProfile,
    isStatusActionPending = false,
    vendorDefaults,
    footer,
}: StreetAgentProfileFormProps) => {
    const isEdit = mode === "edit";
    const showPhase3Settlement =
        STREET_AGENT_PHASE_UI.enabled && !STREET_AGENT_PHASE_UI.phase3Released;
    const showPhase4Lock =
        STREET_AGENT_PHASE_UI.enabled && !STREET_AGENT_PHASE_UI.phase4Released;

    const handleSignedFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        onUploadSignedDocument?.(file);
        event.target.value = "";
    };

    return (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
                <Card
                    sx={{
                        px: "calc(3 * var(--spacing))",
                        py: "80px",
                        textAlign: "center",
                        borderRadius: "var(--shape-borderRadius-lg)",
                        position: "relative",
                        boxShadow: "var(--customShadows-card)",
                    }}
                >
                    {statusChip && (
                        <Box sx={{ position: "absolute", top: 24, right: 24 }}>
                            <Chip
                                label={STATUS_LABELS[statusChip] || statusChip}
                                sx={{
                                    ...getStatusChipStyle(statusChip),
                                    borderRadius: "var(--shape-borderRadius-sm)",
                                    fontWeight: 700,
                                    fontSize: "0.75rem",
                                    height: "24px",
                                }}
                            />
                        </Box>
                    )}

                    <div
                        onClick={onOpenFile}
                        className="w-[144px] h-[144px] m-auto cursor-pointer rounded-full p-[8px] border border-dashed border-[var(--palette-text-disabled)33] hover:opacity-75 transition-opacity"
                    >
                        <div className="w-full h-full rounded-full relative overflow-hidden bg-[var(--palette-text-disabled)14]">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={onFileChange}
                                className="hidden"
                                accept="image/*"
                            />
                            {imageUrl ? (
                                <img src={imageUrl} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-[var(--palette-text-disabled)] flex-col gap-[8px]">
                                    <span className="text-[0.75rem]">{isUploading ? "Đang tải..." : "Tải ảnh lên"}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-[0.75rem] text-[var(--palette-text-disabled)] mt-[24px]">
                        Allowed *.jpeg, *.jpg, *.png, *.gif
                        <br />
                        max size of 3 Mb
                    </div>
                </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
                <Stack spacing={3}>
                    <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                        <SectionTitle title="Thông tin cá nhân" />
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                            <Controller
                                name="lastName"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField {...field} label="Họ" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx} />
                                )}
                            />
                            <Controller
                                name="firstName"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField {...field} label="Tên" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx} />
                                )}
                            />
                            <Controller
                                name="phone"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField {...field} label="Số điện thoại" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx} />
                                )}
                            />
                            <Controller
                                name="cccd"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField {...field} label="Số CCCD" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx} />
                                )}
                            />
                        </Box>
                    </Card>

                    <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                        <SectionTitle title="Thông tin liên hệ" />
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                            <Controller
                                name="contactAddress"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        label="Địa chỉ hoạt động"
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        sx={{ ...fieldSx, gridColumn: { sm: "1 / -1" } }}
                                    />
                                )}
                            />
                            <Controller
                                name="contactProvince"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField {...field} select label="Tỉnh/thành" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx}>
                                        <MenuItem value="">Chọn tỉnh/thành</MenuItem>
                                        {PROVINCE_OPTIONS.map((province) => (
                                            <MenuItem key={province} value={province}>
                                                {province}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />
                        </Box>
                    </Card>

                    <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                        <SectionTitle title="Điều kiện nhận vé" badge="Phase 2 · Allocation" />
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                            <Controller
                                name="contractStartDate"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        value={field.value ?? ""}
                                        type="date"
                                        label="Ngày bắt đầu hợp đồng"
                                        InputLabelProps={{ shrink: true }}
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        sx={fieldSx}
                                    />
                                )}
                            />
                            <Controller
                                name="contractEndDate"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        value={field.value ?? ""}
                                        type="date"
                                        label="Ngày kết thúc hợp đồng"
                                        InputLabelProps={{ shrink: true }}
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        sx={fieldSx}
                                    />
                                )}
                            />
                            <Controller
                                name="dailyTicketCap"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        value={field.value ?? ""}
                                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                        type="number"
                                        inputProps={{ min: 1 }}
                                        label="Hạn mức vé / ngày"
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        sx={fieldSx}
                                    />
                                )}
                            />
                            <Controller
                                name="commissionRate"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        value={field.value ?? ""}
                                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                        type="number"
                                        inputProps={{ min: 0, max: 1, step: 0.01 }}
                                        label="Tỷ lệ hoa hồng"
                                        helperText={
                                            fieldState.error?.message
                                            || (vendorDefaults?.depositRate != null
                                                ? `VD: 0.05 = 5%. Tỷ lệ cọc vendor từ settings: ${vendorDefaults.depositRate}`
                                                : "VD: 0.05 = 5%")
                                        }
                                        fullWidth
                                        error={!!fieldState.error}
                                        sx={fieldSx}
                                    />
                                )}
                            />
                            <Controller
                                name="coverageAreaCodes"
                                control={control}
                                render={({ field, fieldState }) => {
                                    const selected = COVERAGE_AREA_OPTIONS.filter((option) =>
                                        (field.value || []).includes(option.code)
                                    );
                                    return (
                                        <Autocomplete
                                            multiple
                                            options={COVERAGE_AREA_OPTIONS}
                                            value={selected}
                                            getOptionLabel={(option: CoverageAreaOption) => option.label}
                                            isOptionEqualToValue={(a, b) => a.code === b.code}
                                            onChange={(_e, next) => field.onChange(next.map((item) => item.code))}
                                            renderTags={(value, getTagProps) =>
                                                value.map((option, index) => {
                                                    const { key, ...tagProps } = getTagProps({ index });
                                                    return (
                                                        <Chip
                                                            key={key}
                                                            label={option.label}
                                                            size="small"
                                                            {...tagProps}
                                                            sx={{ fontWeight: 600 }}
                                                        />
                                                    );
                                                })
                                            }
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Địa bàn bán"
                                                    placeholder="+ Thêm khu vực"
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message || "Chọn khu vực chuẩn; hệ thống gửi mã (vd. HCM-D1)"}
                                                    sx={fieldSx}
                                                />
                                            )}
                                            sx={{ gridColumn: { sm: "1 / -1" } }}
                                        />
                                    );
                                }}
                            />
                        </Box>
                    </Card>

                    {vendorDefaults && (
                        <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <SectionTitle title="Cấu hình vendor từ hệ thống" badge="Settings" badgeTone="readonly" />
                            <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)", mb: 2.5 }}>
                                Giá trị mặc định lấy từ tab Cấu hình người bán dạo; áp dụng khi bàn giao vé (không lưu theo từng hồ sơ).
                            </Typography>
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                                <ReadOnlyRow
                                    label="Giá vendor mặc định"
                                    value={formatCurrency(vendorDefaults.defaultUnitPrice)}
                                />
                                <ReadOnlyRow
                                    label="Tỷ lệ cọc"
                                    value={
                                        vendorDefaults.depositRate == null
                                            ? "—"
                                            : `${(vendorDefaults.depositRate * 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`
                                    }
                                />
                                <ReadOnlyRow
                                    label="Chính sách trả vé trễ"
                                    value={
                                        vendorDefaults.lateReturnPolicy
                                            ? VENDOR_LATE_RETURN_POLICY_LABELS[vendorDefaults.lateReturnPolicy]
                                            : "—"
                                    }
                                />
                                <ReadOnlyRow
                                    label="Giờ chốt trả vé"
                                    value={vendorDefaults.returnCutoff || "—"}
                                />
                                <ReadOnlyRow
                                    label="TTL giữ vé nháp"
                                    value={
                                        vendorDefaults.draftReservationTtlMinutes == null
                                            ? "—"
                                            : `${vendorDefaults.draftReservationTtlMinutes} phút`
                                    }
                                />
                                <ReadOnlyRow
                                    label="Tồn tối thiểu chừa quầy"
                                    value={
                                        vendorDefaults.counterReservePerStation == null
                                            ? "—"
                                            : `${vendorDefaults.counterReservePerStation} vé/đài`
                                    }
                                />
                            </Box>
                        </Card>
                    )}

                    <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                        <SectionTitle title="Thông tin hệ thống" badge="Read-only" badgeTone="readonly" />
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                            <ReadOnlyRow
                                label="Mã hợp đồng"
                                value={
                                    isEdit
                                        ? contractCode || "—"
                                        : "Hệ thống sẽ tự sinh sau khi lưu."
                                }
                            />
                            <ReadOnlyRow label="Cọc đang giữ" value={formatVnd(depositBalance ?? 0)} />
                            <Box>
                                <ReadOnlyRow
                                    label="Điểm tin cậy"
                                    value={formatConfidencePoints(confidenceScore, confidenceTier)}
                                />
                                {showPhase4Lock && <LockedOverlay phaseLabel="Phase 4" />}
                            </Box>
                            <Stack spacing={1}>
                                <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", fontWeight: 600 }}>
                                    Trạng thái
                                </Typography>
                                <Box>
                                    <Chip
                                        label={STATUS_LABELS[statusChip || "PENDING"] || statusChip || "PENDING"}
                                        sx={{
                                            ...getStatusChipStyle(statusChip || "PENDING"),
                                            fontWeight: 700,
                                        }}
                                    />
                                </Box>
                            </Stack>
                        </Box>

                        {isEdit && (
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }} useFlexGap flexWrap="wrap">
                                <Button
                                    variant="outlined"
                                    onClick={onAdjustDeposit}
                                    sx={{ fontWeight: 700, borderRadius: "8px" }}
                                >
                                    Điều chỉnh cọc
                                </Button>
                                {statusChip === "INACTIVE" ? (
                                    <Button
                                        variant="outlined"
                                        color="success"
                                        onClick={onReactivateProfile}
                                        disabled={isStatusActionPending}
                                        sx={{ fontWeight: 700, borderRadius: "8px" }}
                                    >
                                        Kích hoạt lại
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outlined"
                                        color="warning"
                                        onClick={onLockProfile}
                                        disabled={isStatusActionPending}
                                        sx={{ fontWeight: 700, borderRadius: "8px" }}
                                    >
                                        Khóa hồ sơ
                                    </Button>
                                )}
                            </Stack>
                        )}
                    </Card>

                    {(isEdit || STREET_AGENT_PHASE_UI.enabled) && (
                        <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <SectionTitle title="Hợp đồng" badge="Phase 3 · Settlement" />
                            {isEdit ? (
                                <>
                                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} useFlexGap flexWrap="wrap">
                                        <Button
                                            variant="outlined"
                                            onClick={onPrintContract}
                                            disabled={!contractCode}
                                            sx={{ fontWeight: 700, borderRadius: "8px" }}
                                        >
                                            Xem/In hợp đồng (PDF)
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            onClick={() => signedFileInputRef?.current?.click()}
                                            disabled={isUploadingSignedDocument}
                                            sx={{ fontWeight: 700, borderRadius: "8px" }}
                                        >
                                            {isUploadingSignedDocument ? "Đang tải..." : "Đính kèm bản đã ký"}
                                        </Button>
                                        <input
                                            type="file"
                                            ref={signedFileInputRef}
                                            onChange={handleSignedFileChange}
                                            className="hidden"
                                            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                        />
                                        {contractDocumentUrl ? (
                                            <Button
                                                variant="text"
                                                onClick={onViewSignedDocument}
                                                sx={{ fontWeight: 600, fontSize: "0.875rem", alignSelf: "center" }}
                                            >
                                                Xem bản đã ký
                                            </Button>
                                        ) : (
                                            <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)", alignSelf: "center" }}>
                                                Chưa đính kèm
                                            </Typography>
                                        )}
                                    </Stack>
                                    {showPhase3Settlement && (
                                        <Box sx={{ mt: 2, pointerEvents: "none", opacity: 0.7 }}>
                                            <Button variant="outlined" disabled sx={{ fontWeight: 700, borderRadius: "8px" }}>
                                                Quyết toán cọc
                                            </Button>
                                            <LockedOverlay phaseLabel="Phase 3" />
                                        </Box>
                                    )}
                                </>
                            ) : (
                                <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)" }}>
                                    Sau khi tạo hồ sơ, bạn có thể xem/in hợp đồng và đính kèm bản đã ký tại trang chỉnh sửa.
                                </Typography>
                            )}
                        </Card>
                    )}

                    <Stack direction="row" justifyContent="flex-end">
                        {footer}
                    </Stack>
                </Stack>
            </Grid>
        </Grid>
    );
};
