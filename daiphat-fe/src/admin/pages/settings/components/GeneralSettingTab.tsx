"use client";

import {
    Box,
    Card,
    Grid,
    TextField,
    Button,
    Typography,
    Stack,
    InputAdornment,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { settingGeneralSchema, SettingGeneralFormValues } from "../../../schemas/setting.schema";
import { useSettingGeneral, useUpdateSettingGeneral } from "../hooks/useSettings";
import { useEffect } from "react";
import { FormUploadSingleFile } from "../../../components/upload/FormUploadSingleFile";

const cardSx = {
    p: 3,
    borderRadius: "16px",
    boxShadow: "var(--customShadows-card)",
    height: "100%",
};

const parseHhMm = (value?: string | null): Dayjs | null => {
    if (!value?.trim()) return null;
    const [hours, minutes] = value.trim().split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return dayjs().hour(hours).minute(minutes).second(0).millisecond(0);
};

const SectionHeader = ({
    title,
    description,
}: {
    title: string;
    description?: string;
}) => (
    <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: description ? 0.5 : 0 }}>
            {title}
        </Typography>
        {description ? (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {description}
            </Typography>
        ) : null}
    </Box>
);

export const GeneralSettingTab = () => {
    const { data: generalData, isLoading: isSettingsLoading } = useSettingGeneral();
    const { mutate: updateGeneral, isPending } = useUpdateSettingGeneral();

    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<SettingGeneralFormValues>({
        resolver: zodResolver(settingGeneralSchema),
        defaultValues: {
            websiteName: "",
            websiteDomain: "",
            slogan: "",
            intro: "",
            logo: "",
            favicon: "",
            phone: "",
            supportOpenTime: "08:00",
            supportCloseTime: "22:00",
            email: "",
            address: "",
            copyright: "",
            facebook: "",
            telegram: "",
            instagram: "",
            legalName: "",
            taxCode: "",
            legalRepresentative: "",
            legalRepresentativeTitle: "",
            contractSigningPlace: "",
        },
    });

    const openTime = watch("supportOpenTime");
    const closeTime = watch("supportCloseTime");

    useEffect(() => {
        if (generalData) {
            reset({
                ...generalData,
                supportOpenTime: generalData.supportOpenTime || "08:00",
                supportCloseTime: generalData.supportCloseTime || "22:00",
            });
        }
    }, [generalData, reset]);

    const onSubmit = (data: SettingGeneralFormValues) => {
        updateGeneral(data);
    };

    if (isSettingsLoading) return <Typography>Đang tải...</Typography>;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3}>
                <Card sx={cardSx}>
                    <SectionHeader
                        title="Thông tin pháp lý / hợp đồng đại lý"
                        description="Các trường này hiện trên PDF hợp đồng bán hộ (MST, người ký, chức danh…). Để trống sẽ ra dấu —."
                    />
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                            gap: 2.5,
                        }}
                    >
                        <Controller
                            name="legalName"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    label="Bên A - Tên pháp lý đơn vị"
                                    placeholder="Công ty / hộ kinh doanh Đại Phát"
                                    helperText="Để trống sẽ dùng tên website."
                                />
                            )}
                        />
                        <Controller
                            name="taxCode"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    required
                                    label="Mã số thuế / ĐKKD"
                                    placeholder="0xxxxxxxxxxx"
                                    helperText="Bắt buộc để PDF không còn dấu —"
                                />
                            )}
                        />
                        <Controller
                            name="legalRepresentative"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    required
                                    label="Người đại diện ký hợp đồng"
                                    placeholder="Nguyễn Văn A"
                                    helperText="Họ tên chữ ký Bên A trên PDF"
                                />
                            )}
                        />
                        <Controller
                            name="legalRepresentativeTitle"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    label="Chức danh người đại diện"
                                    placeholder="Giám đốc"
                                />
                            )}
                        />
                        <Controller
                            name="contractSigningPlace"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    label="Địa điểm lập hợp đồng"
                                    placeholder="Thành phố Hồ Chí Minh"
                                    sx={{ gridColumn: { md: "1 / -1" } }}
                                />
                            )}
                        />
                    </Box>
                </Card>

                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, lg: 7 }}>
                        <Card sx={cardSx}>
                            <SectionHeader
                                title="Thông tin định danh Website"
                                description="Các trường dùng cho footer / header client (GENERAL_SETTING)."
                            />
                            <Stack spacing={2.5}>
                                <Controller
                                    name="websiteName"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Tên Website"
                                            placeholder="VD: Đại Phát Lottery"
                                            error={!!errors.websiteName}
                                            helperText={errors.websiteName?.message}
                                        />
                                    )}
                                />
                                <Controller
                                    name="slogan"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Slogan"
                                            placeholder="TÀI LỘC - MAY MẮN - THỊNH VƯỢNG"
                                            error={!!errors.slogan}
                                            helperText={
                                                errors.slogan?.message ||
                                                "Dòng chữ nhỏ dưới tên thương hiệu trên footer."
                                            }
                                        />
                                    )}
                                />
                                <Controller
                                    name="intro"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            multiline
                                            rows={3}
                                            label="Giới thiệu ngắn (Footer)"
                                            placeholder="Đại Phát - Hệ thống xổ số kiến thiết uy tín..."
                                            error={!!errors.intro}
                                            helperText={
                                                errors.intro?.message ||
                                                "Đoạn mô tả dưới logo trên footer."
                                            }
                                        />
                                    )}
                                />
                                <Controller
                                    name="websiteDomain"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Tên miền Website"
                                            placeholder="vd: domain.com"
                                            error={!!errors.websiteDomain}
                                            helperText={
                                                errors.websiteDomain?.message ||
                                                "Không bắt buộc. Để trống nếu chưa cấu hình domain chính thức."
                                            }
                                        />
                                    )}
                                />
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                                        gap: 2.5,
                                    }}
                                >
                                    <Controller
                                        name="email"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                label="Email"
                                                placeholder="hotro@daiphat.com"
                                                error={!!errors.email}
                                                helperText={errors.email?.message}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="phone"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                label="Số điện thoại / Hotline"
                                                placeholder="1900 1234"
                                                error={!!errors.phone}
                                                helperText={errors.phone?.message}
                                            />
                                        )}
                                    />
                                </Box>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                                        Giờ hỗ trợ (mỗi ngày)
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                                            gap: 2.5,
                                        }}
                                    >
                                        <Controller
                                            name="supportOpenTime"
                                            control={control}
                                            render={({ field }) => (
                                                <TimePicker
                                                    label="Từ giờ"
                                                    ampm={false}
                                                    format="HH:mm"
                                                    value={parseHhMm(field.value)}
                                                    onChange={(value) =>
                                                        field.onChange(value ? value.format("HH:mm") : "")
                                                    }
                                                    slotProps={{
                                                        textField: {
                                                            fullWidth: true,
                                                            error: !!errors.supportOpenTime,
                                                            helperText: errors.supportOpenTime?.message,
                                                        },
                                                    }}
                                                />
                                            )}
                                        />
                                        <Controller
                                            name="supportCloseTime"
                                            control={control}
                                            render={({ field }) => (
                                                <TimePicker
                                                    label="Đến giờ"
                                                    ampm={false}
                                                    format="HH:mm"
                                                    value={parseHhMm(field.value)}
                                                    onChange={(value) =>
                                                        field.onChange(value ? value.format("HH:mm") : "")
                                                    }
                                                    slotProps={{
                                                        textField: {
                                                            fullWidth: true,
                                                            error: !!errors.supportCloseTime,
                                                            helperText: errors.supportCloseTime?.message,
                                                        },
                                                    }}
                                                />
                                            )}
                                        />
                                    </Box>
                                    <Typography
                                        variant="caption"
                                        sx={{ mt: 1, display: "block", color: "text.secondary" }}
                                    >
                                        Footer sẽ hiện:{" "}
                                        {openTime && closeTime
                                            ? `${openTime} - ${closeTime} mỗi ngày`
                                            : "—"}
                                    </Typography>
                                </Box>
                                <Controller
                                    name="address"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            multiline
                                            rows={2}
                                            label="Địa chỉ liên hệ"
                                            placeholder="Tầng 5, 123 Lý Chính Thắng, P. Võ Thị Sáu, Q.3, TP.HCM"
                                            error={!!errors.address}
                                            helperText={
                                                errors.address?.message ||
                                                "Hiện trên footer client và mục Địa chỉ liên hệ Bên A trên PDF hợp đồng."
                                            }
                                        />
                                    )}
                                />
                                <Controller
                                    name="copyright"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Bản quyền (Copyright)"
                                            placeholder="© 2026 Đại Phát Lottery. Tất cả quyền được bảo lưu."
                                            error={!!errors.copyright}
                                            helperText={errors.copyright?.message}
                                        />
                                    )}
                                />
                            </Stack>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, lg: 5 }}>
                        <Stack spacing={3}>
                            <Card sx={cardSx}>
                                <SectionHeader
                                    title="Thương hiệu & nhận diện"
                                    description="Logo và favicon dùng trên admin/client."
                                />
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                                        gap: 2.5,
                                    }}
                                >
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                                            Logo Website
                                        </Typography>
                                        <FormUploadSingleFile
                                            name="logo"
                                            control={control}
                                            compact
                                            useRawFile
                                        />
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                                            Favicon Website
                                        </Typography>
                                        <FormUploadSingleFile
                                            name="favicon"
                                            control={control}
                                            compact
                                            useRawFile
                                        />
                                    </Box>
                                </Box>
                            </Card>

                            <Card sx={cardSx}>
                                <SectionHeader
                                    title="Liên kết mạng xã hội"
                                    description="URL công khai trên footer — không phải OAuth secret."
                                />
                                <Stack spacing={2.5}>
                                    <Controller
                                        name="facebook"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                label="Facebook"
                                                placeholder="https://facebook.com/..."
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <Icon icon="logos:facebook" width={20} />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="telegram"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                label="Telegram"
                                                placeholder="https://t.me/..."
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <Icon icon="logos:telegram" width={20} />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="instagram"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                label="Instagram"
                                                placeholder="https://instagram.com/..."
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <Icon icon="logos:instagram-icon" width={20} />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        )}
                                    />
                                </Stack>
                            </Card>
                        </Stack>
                    </Grid>
                </Grid>

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button
                        className="btn-primary-admin"
                        type="submit"
                        variant="contained"
                        disabled={isPending}
                        sx={{
                            background: "#1C252E",
                            px: 6,
                            py: 1.5,
                            borderRadius: "12px",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            textTransform: "none",
                            boxShadow: "0 8px 16px rgba(28, 37, 46, 0.24)",
                            "&:hover": {
                                background: "#454F5B",
                                boxShadow: "none",
                            },
                        }}
                    >
                        {isPending ? "Đang lưu..." : "Lưu cài đặt chung"}
                    </Button>
                </Box>
            </Stack>
        </Box>
        </LocalizationProvider>
    );
};
