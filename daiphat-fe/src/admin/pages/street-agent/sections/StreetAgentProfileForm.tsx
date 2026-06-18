import { Control, Controller } from "react-hook-form";
import {
    Box,
    Card,
    Chip,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { REGION_DATA } from "../../../constants/region.constants";
import { STATUS_LABELS } from "../configs/constants";
import { CreateStreetAgentProfileFormValues } from "../../../schemas/street-agent.schema";

const PROVINCE_OPTIONS = Array.from(new Set(Object.values(REGION_DATA).flat())).sort((a, b) =>
    a.localeCompare(b, "vi")
);

const STATUS_OPTIONS = [
    { value: "ACTIVE", label: STATUS_LABELS.ACTIVE },
    { value: "INACTIVE", label: STATUS_LABELS.INACTIVE },
    { value: "PENDING", label: STATUS_LABELS.PENDING },
];

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "var(--shape-borderRadius)",
        fontSize: "0.875rem",
    },
};

type StreetAgentFormValues = CreateStreetAgentProfileFormValues & {
    depositAdjustmentReason?: string | null;
};

interface StreetAgentProfileFormProps {
    control: Control<StreetAgentFormValues>;
    imageUrl?: string | null;
    isUploading: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onOpenFile: () => void;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    showDepositAdjustmentReason?: boolean;
    statusChip?: string;
    footer: React.ReactNode;
}

export const StreetAgentProfileForm = ({
    control,
    imageUrl,
    isUploading,
    fileInputRef,
    onOpenFile,
    onFileChange,
    showDepositAdjustmentReason = false,
    statusChip,
    footer,
}: StreetAgentProfileFormProps) => {
    const getStatusChipStyle = (status?: string) => {
        if (status === "ACTIVE") {
            return {
                bgcolor: "rgba(34, 197, 94, 0.16)",
                color: "rgb(17, 141, 87)",
            };
        }
        if (status === "PENDING") {
            return {
                bgcolor: "rgba(255, 171, 0, 0.16)",
                color: "rgb(183, 110, 0)",
            };
        }
        return {
            bgcolor: "rgba(145, 158, 171, 0.16)",
            color: "var(--palette-text-secondary)",
        };
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
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3 }}>
                            Thông tin cá nhân
                        </Typography>
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
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3 }}>
                            Thông tin liên hệ
                        </Typography>
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
                            <Controller
                                name="coverageArea"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        label="Địa bàn bán"
                                        placeholder="VD: Quận 1, Quận 3"
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        sx={fieldSx}
                                    />
                                )}
                            />
                        </Box>
                    </Card>

                    <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3 }}>
                            Thông tin hợp đồng
                        </Typography>
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
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
                                        helperText={fieldState.error?.message || "VD: 0.05 = 5%"}
                                        fullWidth
                                        error={!!fieldState.error}
                                        sx={fieldSx}
                                    />
                                )}
                            />
                            <Controller
                                name="depositBalance"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        value={field.value ?? ""}
                                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                        type="number"
                                        inputProps={{ min: 0 }}
                                        label="Số dư ký quỹ (VNĐ)"
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        sx={fieldSx}
                                    />
                                )}
                            />
                            {showDepositAdjustmentReason && (
                                <Controller
                                    name="depositAdjustmentReason"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextField
                                            {...field}
                                            value={field.value ?? ""}
                                            label="Lý do điều chỉnh ký quỹ"
                                            placeholder="Nhập lý do khi thay đổi số dư ký quỹ"
                                            fullWidth
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                            sx={{ ...fieldSx, gridColumn: { sm: "1 / -1" } }}
                                        />
                                    )}
                                />
                            )}
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
                                name="status"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField {...field} select label="Trạng thái" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx}>
                                        {STATUS_OPTIONS.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />
                        </Box>
                    </Card>

                    <Stack direction="row" justifyContent="flex-end">
                        {footer}
                    </Stack>
                </Stack>
            </Grid>
        </Grid>
    );
};
