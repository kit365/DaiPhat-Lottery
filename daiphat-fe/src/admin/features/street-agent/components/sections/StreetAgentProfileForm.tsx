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
import { formatConfidencePoints, formatCurrency, formatVnd } from "../../utils/format";
import { useVietnamLocation } from "../../hooks/useVietnamLocation";

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "var(--shape-borderRadius)",
        fontSize: "0.875rem",
    },
};

type StreetAgentFormValues = CreateStreetAgentProfileFormValues;

interface StreetAgentProfileFormProps {
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
    footer: React.ReactNode;
}

const SectionTitle = ({ title, helperText }: { title: string; helperText?: string }) => (
    <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, mb: helperText ? 0.5 : 0 }}>
            {title}
        </Typography>
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

export const StreetAgentProfileForm = ({
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
}: StreetAgentProfileFormProps) => {
    const isEdit = mode === "edit";
    const { data: vietnamLocations, isLoading: isLoadingLocations } = useVietnamLocation();
    const contactProvince = useWatch({
        control: control as Control<StreetAgentFormValues>,
        name: "contactProvince",
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

    const signedContractCard = (
        <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
            {isEdit && contractDocumentUrl ? (
                <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={2} useFlexGap flexWrap="wrap">
                    <Stack spacing={0.5}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, m: 0 }}>
                                Hợp đồng đã ký
                            </Typography>
                            <Chip
                                size="small"
                                label="Đã tải lên"
                                color="success"
                                sx={{ height: 24, fontWeight: 600, fontSize: "0.75rem" }}
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
                <>
                    <SectionTitle
                        title={isEdit ? "Hợp đồng đã ký" : "Hợp đồng"}
                        helperText={isEdit ? "Chưa có bản đã ký. Tải file lên sau khi người bán vé số ký xác nhận." : "Hợp đồng sẽ được tạo sau khi lưu hồ sơ."}
                    />
                    {isEdit ? (
                        <Stack spacing={2}>
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
                        </Stack>
                    ) : (
                        <Alert severity="info" icon={<PictureAsPdfIcon fontSize="small" aria-hidden="true" />}>
                            Lưu hồ sơ trước. Sau đó hệ thống sẽ tạo bản dự thảo để bạn in, ký và tải bản đã ký lên ở bước tiếp theo.
                        </Alert>
                    )}
                </>
            )}
        </Card>
    );

    return (
        <Box>
            <Stack spacing={3}>
                <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                        <SectionTitle title="Thông tin cá nhân" helperText="Thông tin cơ bản của người bán vé số." />
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                            <Box sx={{ gridColumn: { sm: "1 / -1" }, display: "flex", justifyContent: "center", mb: 2, position: "relative" }}>
                                {statusChip && (
                                    <Box sx={{ position: "absolute", top: 0, right: 0 }}>
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

                    {isEdit && signedContractCard}

                    <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                        <SectionTitle title="Điều kiện nhận vé" helperText="Hạn mức giao theo hợp đồng và chính sách vận hành." />
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                            <Controller
                                name="contractStartDate"
                                control={control}
                                render={({ field, fieldState }) => (
                                    isEdit && contractDocumentUrl ? (
                                        <ReadOnlyRow label="Ngày bắt đầu hợp đồng" value={field.value ? field.value.split("-").reverse().join("/") : "—"} />
                                    ) : (
                                        <TextField
                                            {...field}
                                            required
                                            value={field.value ?? ""}
                                            type="date"
                                            label="Ngày bắt đầu hợp đồng"
                                            slotProps={{ inputLabel: { shrink: true } }}
                                            fullWidth
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                            sx={fieldSx}
                                        />
                                    )
                                )}
                            />
                            <Controller
                                name="contractEndDate"
                                control={control}
                                render={({ field, fieldState }) => (
                                    isEdit && contractDocumentUrl ? (
                                        <ReadOnlyRow label="Ngày kết thúc hợp đồng" value={field.value ? field.value.split("-").reverse().join("/") : "—"} />
                                    ) : (
                                        <TextField
                                            {...field}
                                            required
                                            value={field.value ?? ""}
                                            type="date"
                                            label="Ngày kết thúc hợp đồng"
                                            slotProps={{ inputLabel: { shrink: true } }}
                                            fullWidth
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                            sx={fieldSx}
                                        />
                                    )
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
                                        label="Hạn mức tối đa theo hợp đồng (vé/ngày)"
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
                                                    ? "Hạn mức ghi trong hợp đồng hiện tại. Thay đổi hạn mức sẽ yêu cầu ký lại hợp đồng."
                                                    : "Hạn mức ghi trong hợp đồng hiện tại. Sau khi lưu thay đổi, cần tải lại bản ký.")
                                                : `Mặc định ${vendorDefaults?.defaultContractMaxDailyCap ?? 200} vé/ngày; nhân viên có thể điều chỉnh theo hợp đồng.`)
                                        }
                                        sx={fieldSx}
                                    />
                                )}
                            />
                            {isEdit && effectiveDailyCap != null && (
                                <ReadOnlyRow
                                    label="Hạn mức giao thực tế"
                                    value={`${effectiveDailyCap} vé/ngày`}
                                    helperText="Hạn mức áp dụng sau khi tính điểm tin cậy."
                                />
                            )}
                        </Box>
                    </Card>

                    <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                        <SectionTitle title="Thông tin liên hệ" helperText="Địa chỉ và khu vực hoạt động bán vé." />
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                            <Controller
                                name="contactProvince"
                                control={control}
                                render={({ field, fieldState }) => {
                                    const selectedOption = vietnamLocations?.find(p => p.name === field.value) || null;
                                    return (
                                        <Autocomplete
                                            options={vietnamLocations || []}
                                            getOptionLabel={(option) => option.name}
                                            value={selectedOption}
                                            onChange={(_, newValue) => {
                                                field.onChange(newValue ? newValue.name : "");
                                                setValue?.("contactWard", "");
                                            }}
                                            disabled={isLoadingLocations}
                                            loading={isLoadingLocations}
                                            loadingText="Đang tải danh sách địa phương…"
                                            noOptionsText="Không tìm thấy tỉnh/thành"
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Tỉnh/thành"
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message || (isLoadingLocations ? "Đang tải danh sách địa phương…" : undefined)}
                                                    sx={fieldSx}
                                                />
                                            )}
                                        />
                                    );
                                }}
                            />
                            <Controller
                                name="contactWard"
                                control={control}
                                render={({ field, fieldState }) => {
                                    const selectedWard = wardOptions.find(w => w.name === field.value) || null;
                                    return (
                                        <Autocomplete
                                            options={wardOptions}
                                            getOptionLabel={(option) => option.name}
                                            value={selectedWard}
                                            onChange={(_, newValue) => {
                                                field.onChange(newValue ? newValue.name : "");
                                            }}
                                            disabled={isLoadingLocations || !contactProvince}
                                            loading={isLoadingLocations}
                                            loadingText="Đang tải danh sách địa phương…"
                                            noOptionsText={!contactProvince ? "Vui lòng chọn tỉnh/thành trước" : "Không tìm thấy phường/xã"}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Phường/xã"
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message || (!contactProvince ? "Chọn tỉnh/thành trước" : undefined)}
                                                    sx={fieldSx}
                                                />
                                            )}
                                        />
                                    );
                                }}
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

                    {!isEdit && signedContractCard}

                    {isEdit && (
                        <Card sx={{ p: 2.5, borderRadius: "var(--shape-borderRadius-lg)", bgcolor: "var(--palette-background-neutral)", border: "1px solid var(--palette-divider)", boxShadow: "none" }}>
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                                <ReadOnlyRow label="Cọc đang giữ" value={formatVnd(depositBalance ?? 0)} />
                                <ReadOnlyRow
                                    label="Điểm tin cậy"
                                    value={formatConfidencePoints(confidenceScore, confidenceTier)}
                                />
                            </Box>

                            <Box sx={{ mt: 3, pt: 2, borderTop: "1px dashed var(--palette-divider)", display: "flex", justifyContent: "flex-end" }}>
                                {statusChip === "INACTIVE" ? (
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        size="small"
                                        onClick={onReactivateProfile}
                                        disabled={isStatusActionPending}
                                        sx={{ fontWeight: 600, borderRadius: "6px" }}
                                    >
                                        {isStatusActionPending ? "Đang xử lý..." : "Kích hoạt lại"}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="text"
                                        color="error"
                                        size="small"
                                        onClick={onLockProfile}
                                        disabled={isStatusActionPending}
                                        sx={{ fontWeight: 600, borderRadius: "6px" }}
                                    >
                                        {isStatusActionPending ? "Đang xử lý..." : "Khóa hồ sơ"}
                                    </Button>
                                )}
                            </Box>
                        </Card>
                    )}

                    <Stack direction="row" justifyContent="flex-end">
                        {footer}
                    </Stack>
                </Stack>
            </Box>
    );
};
