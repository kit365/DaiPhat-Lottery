"use client";

import { Control, Controller, UseFormSetValue, useWatch } from "react-hook-form";
import { useMemo } from "react";
import {
    Autocomplete,
    Alert,
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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { STATUS_LABELS } from "../configs/constants";
import { CreateStreetAgentProfileFormValues } from "../../schemas/street-agent.schema";
import {
    COVERAGE_AREA_OPTIONS,
    CoverageAreaOption,
} from "../../constants/coverageAreas";
import {
    VendorSettingsDefaults,
    VENDOR_LATE_RETURN_POLICY_LABELS,
} from "../../hooks/useVendorSettingsDefaults";
import { formatConfidencePoints, formatCurrency, formatVendorHandoverLimit, formatVnd } from "../../utils/format";
import { useVietnamLocation } from "../../hooks/useVietnamLocation";
import { AdminDatePicker } from "../../../../components/ui/AdminDatePicker";

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "var(--shape-borderRadius)",
        fontSize: "0.875rem",
    },
};

type StreetAgentFormValues = CreateStreetAgentProfileFormValues;

interface StreetAgentProfileFormProps {
    id?: string;
    contractSectionId?: string;
    control: Control<StreetAgentFormValues> | Control<any>;
    setValue?: UseFormSetValue<StreetAgentFormValues>;
    imageUrl?: string | null;
    isUploading: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onOpenFile: () => void;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    mode?: "create" | "edit";
    contractCode?: string | null;
    contractDocumentUrl?: string | null;
    contractMaxDailyCap?: number | null;
    effectiveDailyCap?: number | null;
    depositBalance?: number | null;
    statusChip?: string;
    confidenceScore?: number | null;
    confidenceTier?: string | null;
    onUploadSignedDocument?: (file: File) => void;
    onViewSignedDocument?: () => void;
    isUploadingSignedDocument?: boolean;
    signedFileInputRef?: React.RefObject<HTMLInputElement | null>;
    onLockProfile?: () => void;
    onReactivateProfile?: () => void;
    isStatusActionPending?: boolean;
    vendorDefaults?: VendorSettingsDefaults | null;
    footer?: React.ReactNode;
    sections?: {
        personal?: boolean;
        signedContract?: boolean;
        contract?: boolean;
        contact?: boolean;
        policy?: boolean;
        statusSummary?: boolean;
        footer?: boolean;
    };
}

const SectionTitle = ({
    title,
    helperText,
    inlineAdornment,
    endAdornment,
}: {
    title: string;
    helperText?: string;
    inlineAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
}) => (
    <Box sx={{ mb: 3 }}>
        <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            useFlexGap
            flexWrap="wrap"
            sx={{ mb: helperText ? 0.5 : 0 }}
        >
            <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
                <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, m: 0 }}>
                    {title}
                </Typography>
                {inlineAdornment}
            </Stack>
            {endAdornment}
        </Stack>
        {helperText && (
            <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)" }}>
                {helperText}
            </Typography>
        )}
    </Box>
);

const ReadOnlyRow = ({ label, value, helperText }: { label: string; value: React.ReactNode; helperText?: React.ReactNode }) => (
    <Stack spacing={0.5}>
        <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", fontWeight: 600 }}>
            {label}
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--palette-text-primary)", fontWeight: 600 }}>
            {value}
        </Typography>
        {helperText && (
            <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", mt: 0.5, lineHeight: 1.3 }}>
                {helperText}
            </Typography>
        )}
    </Stack>
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

const STATUS_CHIP_SX = {
    borderRadius: "var(--shape-borderRadius-sm)",
    fontWeight: 700,
    fontSize: "0.75rem",
    height: 28,
};

const ACTION_CHIP_SX = {
    borderRadius: "var(--shape-borderRadius-sm)",
    fontWeight: 700,
    fontSize: "0.8125rem",
    height: 32,
    px: 0.5,
};

export const StreetAgentProfileForm = ({
    id,
    contractSectionId,
    control,
    setValue,
    imageUrl,
    isUploading,
    fileInputRef,
    onOpenFile,
    onFileChange,
    mode = "create",
    contractCode,
    contractDocumentUrl,
    contractMaxDailyCap,
    effectiveDailyCap,
    depositBalance,
    statusChip,
    confidenceScore,
    confidenceTier,
    onUploadSignedDocument,
    onViewSignedDocument,
    isUploadingSignedDocument = false,
    signedFileInputRef,
    onLockProfile,
    onReactivateProfile,
    isStatusActionPending = false,
    vendorDefaults,
    footer,
    sections: sectionsProp,
}: StreetAgentProfileFormProps) => {
    const sections = {
        personal: true,
        signedContract: true,
        contract: true,
        contact: true,
        policy: true,
        statusSummary: true,
        footer: true,
        ...sectionsProp,
    };
    const isEdit = mode === "edit";
    const { data: vietnamLocations, isLoading: isLoadingLocations } = useVietnamLocation();
    const contactProvince = useWatch({
        control: control as Control<StreetAgentFormValues>,
        name: "contactProvince",
    });
    const contractStartDate = useWatch({
        control: control as Control<StreetAgentFormValues>,
        name: "contractStartDate",
    });
    const selectedProvince = useMemo(
        () => vietnamLocations?.find((province) => province.name === contactProvince),
        [contactProvince, vietnamLocations]
    );
    const wardOptions = selectedProvince?.wards || [];

    const handleAvatarKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenFile();
        }
    };

    const handleSignedFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        onUploadSignedDocument?.(file);
        event.target.value = "";
    };

    const statusActionButton =
        isEdit && sections.statusSummary ? (
            statusChip === "INACTIVE" ? (
                <Chip
                    label={isStatusActionPending ? "Đang xử lý..." : "Kích hoạt lại"}
                    onClick={onReactivateProfile}
                    disabled={isStatusActionPending}
                    clickable={!isStatusActionPending}
                    sx={{
                        bgcolor: "rgba(34, 197, 94, 0.12)",
                        color: "rgb(17, 141, 87)",
                        ...ACTION_CHIP_SX,
                        "&:hover": {
                            bgcolor: "rgba(34, 197, 94, 0.2)",
                        },
                    }}
                />
            ) : (
                <Chip
                    label={isStatusActionPending ? "Đang xử lý..." : "Khóa hồ sơ"}
                    onClick={onLockProfile}
                    disabled={isStatusActionPending}
                    clickable={!isStatusActionPending}
                    sx={{
                        bgcolor: "rgba(255, 86, 48, 0.08)",
                        color: "var(--palette-error-dark)",
                        ...ACTION_CHIP_SX,
                        "&:hover": {
                            bgcolor: "rgba(255, 86, 48, 0.16)",
                        },
                    }}
                />
            )
        ) : null;

    const personalStatusBadge = statusChip ? (
        <Chip
            label={STATUS_LABELS[statusChip] || statusChip}
            sx={{
                ...getStatusChipStyle(statusChip),
                ...STATUS_CHIP_SX,
            }}
        />
    ) : null;

    const profileMetricsSection =
        isEdit && sections.statusSummary ? (
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                    gap: 3,
                }}
            >
                <ReadOnlyRow label="Cọc đang giữ" value={formatVnd(depositBalance ?? 0)} />
                <ReadOnlyRow
                    label="Điểm tin cậy"
                    value={formatConfidencePoints(confidenceScore, confidenceTier)}
                />
            </Box>
        ) : null;

    const signedContractSection = sections.signedContract ? (
        <>
            {isEdit && contractDocumentUrl ? (
                <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={2} useFlexGap flexWrap="wrap">
                    <Stack spacing={0.5}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 600, m: 0 }}>
                                Hợp đồng đã ký
                            </Typography>
                            <Chip
                                size="small"
                                label="Đã tải lên"
                                sx={{
                                    ...getStatusChipStyle("ACTIVE"),
                                    ...STATUS_CHIP_SX,
                                }}
                            />
                        </Stack>
                        <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)" }}>
                            {contractCode ? `Mã HĐ: ${contractCode} · ` : ""}Bản ký đang được lưu trên hệ thống.
                        </Typography>
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignSelf={{ xs: "stretch", sm: "auto" }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={onViewSignedDocument}
                            sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 140 }, fontWeight: 600, borderRadius: "8px", boxShadow: "none" }}
                        >
                            Mở bản đã ký
                        </Button>
                        <Button
                            variant="outlined"
                            color="inherit"
                            startIcon={<CloudUploadIcon aria-hidden="true" />}
                            onClick={() => signedFileInputRef?.current?.click()}
                            disabled={isUploadingSignedDocument}
                            sx={{ width: { xs: "100%", sm: "auto" }, fontWeight: 600, borderRadius: "8px" }}
                        >
                            {isUploadingSignedDocument ? "Đang tải…" : "Thay bản đã ký"}
                        </Button>
                    </Stack>
                    <input
                        type="file"
                        ref={signedFileInputRef}
                        onChange={handleSignedFileChange}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    />
                </Stack>
            ) : (
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {isEdit ? "Hợp đồng đã ký" : "Hợp đồng"}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)" }}>
                            {isEdit
                                ? "Chưa có bản đã ký. Tải file lên sau khi người bán vé số ký xác nhận."
                                : "Hợp đồng sẽ được tạo sau khi lưu hồ sơ."}
                        </Typography>
                    </Box>
                    {isEdit ? (
                        <>
                            <Button
                                variant="contained"
                                startIcon={<CloudUploadIcon aria-hidden="true" />}
                                onClick={() => signedFileInputRef?.current?.click()}
                                disabled={isUploadingSignedDocument}
                                sx={{ fontWeight: 700, borderRadius: "8px", boxShadow: "none", alignSelf: "flex-start" }}
                            >
                                {isUploadingSignedDocument ? "Đang tải lên…" : "Tải bản đã ký lên"}
                            </Button>
                            <input
                                type="file"
                                ref={signedFileInputRef}
                                onChange={handleSignedFileChange}
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                            />
                        </>
                    ) : (
                        <Alert severity="info" icon={<PictureAsPdfIcon fontSize="small" aria-hidden="true" />}>
                            Lưu hồ sơ trước. Sau đó hệ thống sẽ tạo bản dự thảo để bạn in, ký và tải bản đã ký lên ở bước tiếp theo.
                        </Alert>
                    )}
                </Stack>
            )}
        </>
    ) : null;

    const contractSubsectionSx = {
        pt: 3,
        mt: 3,
        borderTop: "1px dashed var(--palette-divider)",
    } as const;

    return (
        <Box id={id}>
            <Stack spacing={3}>
                {sections.personal ? (
                <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                        <SectionTitle
                            title="Thông tin cá nhân"
                            helperText="Thông tin cơ bản của người bán vé số."
                            inlineAdornment={personalStatusBadge}
                            endAdornment={statusActionButton}
                        />
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                            <Box sx={{ gridColumn: { sm: "1 / -1" }, display: "flex", justifyContent: "center", mb: 2 }}>
                                <Stack alignItems="center" spacing={2}>
                                <div
                                    role="button"
                                    tabIndex={0}
                                    aria-label="Tải ảnh đại diện"
                                    onClick={onOpenFile}
                                    onKeyDown={handleAvatarKeyDown}
                                    className="w-[144px] h-[144px] m-auto cursor-pointer rounded-full p-[8px] border border-dashed border-[var(--palette-text-disabled)33] hover:opacity-75 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--palette-primary-main)]"
                                >
                                    <div className="w-full h-full rounded-full relative overflow-hidden bg-[var(--palette-text-disabled)14]">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={onFileChange}
                                            className="hidden"
                                            accept="image/*"
                                            aria-hidden="true"
                                            tabIndex={-1}
                                        />
                                        {imageUrl ? (
                                            <img src={imageUrl} alt="Ảnh đại diện" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-[var(--palette-text-disabled)] flex-col gap-[8px]">
                                                <span className="text-[0.75rem]">{isUploading ? "Đang tải..." : "Tải ảnh lên"}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)", textAlign: "center" }}>
                                    Allowed *.jpeg, *.jpg, *.png, *.gif<br />max size of 3 Mb
                                </Typography>
                            </Stack>
                        </Box>
                        <Controller
                            name="lastName"
                            control={control}
                            render={({ field, fieldState }) => (
                                <TextField {...field} required label="Họ" autoComplete="family-name" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx} />
                            )}
                        />
                        <Controller
                            name="firstName"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField {...field} required label="Tên" autoComplete="given-name" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx} />
                                )}
                            />
                            <Controller
                                name="phone"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField {...field} required label="Số điện thoại" type="tel" autoComplete="tel" slotProps={{ htmlInput: { inputMode: "numeric" } }} fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx} />
                                )}
                            />
                            <Controller
                                name="cccd"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField {...field} required label="Số CCCD" type="text" slotProps={{ htmlInput: { inputMode: "numeric" } }} fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx} />
                                )}
                            />
                        </Box>
                    </Card>
                ) : null}

                    {sections.contract ? (
                    <Card id={contractSectionId} sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                        <SectionTitle title="Thông tin hợp đồng" helperText="Giới hạn số vé trên mỗi phiếu bàn giao theo hợp đồng và mức tín cậy." />
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                            <Controller
                                name="contractStartDate"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <AdminDatePicker
                                        label="Ngày bắt đầu hợp đồng"
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        allowInput
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                    />
                                )}
                            />
                            <Controller
                                name="contractEndDate"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <AdminDatePicker
                                        label="Ngày kết thúc hợp đồng"
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        min={contractStartDate || undefined}
                                        allowInput
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                    />
                                )}
                            />
                            <Controller
                                name="contractMaxDailyCap"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        required
                                        type="number"
                                        label="Giới hạn tối đa mỗi phiếu bàn giao (vé)"
                                        placeholder={vendorDefaults?.defaultContractMaxDailyCap?.toString() || "200"}
                                        slotProps={{ htmlInput: { min: 1, step: 1, inputMode: "numeric" } }}
                                        value={field.value ?? ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            field.onChange(val === "" ? null : Number(val));
                                        }}
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={
                                            fieldState.error?.message ||
                                            (isEdit
                                                ? (contractDocumentUrl
                                                    ? "Giới hạn ghi trong hợp đồng hiện tại. Thay đổi giới hạn sẽ yêu cầu ký lại hợp đồng."
                                                    : "Giới hạn ghi trong hợp đồng hiện tại. Sau khi lưu thay đổi, cần tải lại bản ký.")
                                                : `Mặc định ${vendorDefaults?.defaultContractMaxDailyCap ?? 200} vé/phiếu; nhân viên có thể điều chỉnh theo hợp đồng.`)
                                        }
                                        sx={fieldSx}
                                    />
                                )}
                            />
                            {isEdit && effectiveDailyCap != null && (
                                <ReadOnlyRow
                                    label="Giới hạn giao hiện tại"
                                    value={formatVendorHandoverLimit(effectiveDailyCap)}
                                    helperText="Hệ thống áp dụng theo mức tín cậy. Sau khi phiếu được quyết toán, người bán có thể nhận phiếu mới."
                                />
                            )}
                        </Box>

                        {profileMetricsSection ? <Box sx={contractSubsectionSx}>{profileMetricsSection}</Box> : null}

                        {signedContractSection ? <Box sx={contractSubsectionSx}>{signedContractSection}</Box> : null}
                    </Card>
                    ) : null}

                    {sections.contact ? (
                    <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                        <SectionTitle title="Thông tin liên hệ" helperText="Địa chỉ và khu vực hoạt động bán vé." />
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                            <Controller
                                name="contactProvince"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        select
                                        fullWidth
                                        label="Tỉnh/thành"
                                        value={field.value ?? ""}
                                        onChange={(event) => {
                                            field.onChange(event.target.value);
                                            setValue?.("contactWard", "");
                                        }}
                                        disabled={isLoadingLocations}
                                        error={!!fieldState.error}
                                        helperText={
                                            fieldState.error?.message ||
                                            (isLoadingLocations ? "Đang tải danh sách địa phương…" : undefined)
                                        }
                                        sx={fieldSx}
                                    >
                                        <MenuItem value="">
                                            <em>Chọn tỉnh/thành</em>
                                        </MenuItem>
                                        {(vietnamLocations || []).map((province) => (
                                            <MenuItem key={province.name} value={province.name}>
                                                {province.name}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />
                            <Controller
                                name="contactWard"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        select
                                        fullWidth
                                        label="Phường/xã"
                                        value={field.value ?? ""}
                                        disabled={isLoadingLocations || !contactProvince}
                                        error={!!fieldState.error}
                                        helperText={
                                            fieldState.error?.message ||
                                            (!contactProvince ? "Chọn tỉnh/thành trước" : undefined)
                                        }
                                        sx={fieldSx}
                                    >
                                        <MenuItem value="">
                                            <em>{contactProvince ? "Chọn phường/xã" : "Chọn tỉnh/thành trước"}</em>
                                        </MenuItem>
                                        {wardOptions.map((ward) => (
                                            <MenuItem key={ward.name} value={ward.name}>
                                                {ward.name}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />
                            <Controller
                                name="contactAddress"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        value={field.value ?? ""}
                                        label="Địa chỉ chi tiết"
                                        placeholder="Số nhà, tên đường..."
                                        autoComplete="street-address"
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        sx={{ ...fieldSx, gridColumn: { sm: "1 / -1" } }}
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
                                            openText="Mở danh sách"
                                            closeText="Đóng"
                                            clearText="Xóa"
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
                                                    label="Khu vực bán"
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
                    ) : null}

                    {sections.policy && vendorDefaults && (
                        <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <SectionTitle title="Chính sách áp dụng" helperText="Các giá trị này được cấu hình chung từ hệ thống và áp dụng tự động cho người bán vé số." />
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                                <ReadOnlyRow
                                    label="Tỷ lệ hoa hồng theo mệnh giá"
                                    value={
                                        vendorDefaults.commissionRate == null
                                            ? "—"
                                            : `${(vendorDefaults.commissionRate * 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`
                                    }
                                    helperText={
                                        vendorDefaults.commissionRate == null
                                            ? "Giá người bán vé số = mệnh giá - hoa hồng"
                                            : `Tham khảo (giá bán khách 10.000đ/vé): Hoa hồng ${formatCurrency(10000 * vendorDefaults.commissionRate)}/vé · Giá người bán vé số ${formatCurrency(10000 * (1 - vendorDefaults.commissionRate))}/vé. Bảng kê thực tế là gốc.`
                                    }
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
                            </Box>
                        </Card>
                    )}

                    {sections.footer && footer ? (
                    <Stack direction="row" justifyContent="flex-end">
                        {footer}
                    </Stack>
                    ) : null}
                </Stack>
            </Box>
    );
};
