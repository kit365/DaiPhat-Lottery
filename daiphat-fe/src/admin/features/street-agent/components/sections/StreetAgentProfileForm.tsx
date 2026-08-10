"use client";

import { Control, Controller, UseFormSetValue, useWatch } from "react-hook-form";
import { useMemo } from "react";
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
    effectiveDailyCap?: number | null;
    remainingDailyCap?: number | null;
    depositBalance?: number | null;
    statusChip?: string;
    confidenceScore?: number | null;
    confidenceTier?: string | null;
    onPrintContract?: () => void;
    onUploadSignedDocument?: (file: File) => void;
    onViewSignedDocument?: () => void;
    isUploadingSignedDocument?: boolean;
    signedFileInputRef?: React.RefObject<HTMLInputElement | null>;
    onAdjustApprovedDailyCap?: () => void;
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
    effectiveDailyCap,
    remainingDailyCap,
    depositBalance,
    statusChip,
    confidenceScore,
    confidenceTier,
    onPrintContract,
    onUploadSignedDocument,
    onViewSignedDocument,
    isUploadingSignedDocument = false,
    signedFileInputRef,
    onAdjustApprovedDailyCap,
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

    return (
        <Box>
            <Stack spacing={3}>
                <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                    <SectionTitle title="Thông tin cá nhân" helperText="Thông tin cơ bản của đại lý." />
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

                    <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                        <SectionTitle title="Điều kiện nhận vé" helperText="Thông tin hợp đồng và hạn mức cấp vé." />
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                            <Controller
                                name="contractStartDate"
                                control={control}
                                render={({ field, fieldState }) => (
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
                                )}
                            />
                            <Controller
                                name="contractEndDate"
                                control={control}
                                render={({ field, fieldState }) => (
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
                                )}
                            />
                            <Controller
                                name="contractMaxDailyCap"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        required
                                        value={field.value ?? ""}
                                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                        type="number"
                                        slotProps={{ htmlInput: { min: 1 } }}
                                        label="Giới hạn tối đa theo hợp đồng"
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message || "Giới hạn tối đa ghi trong hợp đồng; muốn tăng phải ký phụ lục hoặc hợp đồng mới."}
                                        sx={fieldSx}
                                    />
                                )}
                            />
                            {isEdit && (
                                <Stack justifyContent="center" alignItems="flex-start">
                                    <Button variant="text" size="small" onClick={onAdjustApprovedDailyCap} sx={{ px: 0 }}>
                                        Điều chỉnh hạn mức được duyệt
                                    </Button>
                                </Stack>
                            )}
                        </Box>
                    </Card>

                    {vendorDefaults && (
                        <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <SectionTitle title="Chính sách áp dụng" helperText="Các giá trị này được cấu hình chung từ hệ thống và áp dụng tự động cho đại lý." />
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
                                            ? "Giá vendor = mệnh giá - hoa hồng"
                                            : `Tham khảo (giá bán khách 10.000đ/vé): Hoa hồng ${formatCurrency(10000 * vendorDefaults.commissionRate)}/vé · Giá vendor ${formatCurrency(10000 * (1 - vendorDefaults.commissionRate))}/vé. Bảng kê thực tế là gốc.`
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

                    {isEdit && (
                        <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <SectionTitle title="Thông tin hệ thống" helperText="Thông tin chỉ đọc được cập nhật tự động từ hệ thống." />
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
                            <ReadOnlyRow
                                label="Mã hợp đồng"
                                value={isEdit ? (contractCode || "—") : "Hệ thống sẽ tự sinh sau khi lưu."}
                            />
                            <ReadOnlyRow label="Cọc đang giữ" value={isEdit ? formatVnd(depositBalance ?? 0) : "0 ₫"} />
                            <ReadOnlyRow
                                label={isEdit ? "Hạn mức giao hiện tại" : "Hạn mức giao dự kiến"}
                                value={isEdit ? (effectiveDailyCap != null ? `${effectiveDailyCap} vé/ngày${remainingDailyCap != null ? ` · còn ${remainingDailyCap}` : ""}` : "—") : "Hệ thống tính sau khi lưu hồ sơ"}
                                helperText="Mức này tự thay đổi theo mức tín nhiệm và hạn mức được duyệt."
                            />
                            <Box>
                                <ReadOnlyRow
                                    label="Điểm tin cậy"
                                    value={isEdit ? formatConfidencePoints(confidenceScore, confidenceTier) : "50 điểm (Mới)"}
                                />
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

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }} useFlexGap flexWrap="wrap">
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
                        </Card>
                    )}

                    <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                        <SectionTitle title="Tiếp nhận hợp đồng" helperText="Trạng thái và tiến độ ký kết hợp đồng đại lý." />
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
                            </>
                        ) : (
                            <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)" }}>
                                Sau khi tạo hồ sơ, bạn có thể xem/in hợp đồng và đính kèm bản đã ký tại trang chỉnh sửa.
                            </Typography>
                        )}
                    </Card>

                    <Stack direction="row" justifyContent="flex-end">
                        {footer}
                    </Stack>
                </Stack>
            </Box>
    );
};
