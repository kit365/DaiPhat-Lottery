import { Box, Card, Grid, TextField, Typography, Stack } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingGeneralSchema } from "../../schemas/setting.schema";
import { Title } from "../../components/ui/Title";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { toast } from "react-toastify";
import { useEffect, useRef, useState } from "react";
import { uploadImagesToCloudinary } from "../../api/uploadCloudinary.api";
import { useSettingGeneral, useUpdateSettingGeneral } from "./hooks/useSettingGeneral";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { Tiptap } from "../../components/layouts/titap/Tiptap";

export const SettingGeneralPage = () => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: initialData, isLoading: isSettingsLoading } = useSettingGeneral();
    const { mutate: updateSettings } = useUpdateSettingGeneral();

    const {
        control,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { isSubmitting }
    } = useForm<any>({
        resolver: zodResolver(settingGeneralSchema),
        defaultValues: {
            websiteName: "",
            logo: "",
            phone: "",
            email: "",
            address: "",
            copyright: "",
            defaultPassword: "password123",
            facebook: "",
            instagram: "",
            ticketServiceColors: [],
            privacyPolicy: "",
            termsOfUse: "",
            conditions: ""
        },
    });

    useEffect(() => {
        if (!initialData) return;
        reset({
            ...initialData,
            ticketServiceColors: initialData.ticketServiceColors || [],
            privacyPolicy: initialData.privacyPolicy || "",
            termsOfUse: initialData.termsOfUse || "",
            conditions: initialData.conditions || ""
        });
    }, [initialData, reset]);

    const logo = watch("logo");

    const handleOpenFile = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Định dạng file không hợp lệ. Vui lòng chọn *.jpeg, *.jpg, *.png, hoặc *.gif");
            event.target.value = "";
            return;
        }

        // Validate file size (3MB)
        const maxSize = 3 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error("Dung lượng file quá lớn. Tối đa là 3 Mb");
            event.target.value = "";
            return;
        }

        try {
            setIsUploading(true);
            const [url] = await uploadImagesToCloudinary([file]);
            setValue("logo", url, { shouldValidate: true });
            toast.success("Tải logo thành công!");
        } catch (error) {
            toast.error("Tải logo thất bại!");
        } finally {
            setIsUploading(false);
        }
    };

    const onSubmit = async (data: any) => {
        const formData = data;
        // Only save ticketServiceId and color
        const formattedData = {
            ...formData,
            ticketServiceColors: formData.ticketServiceColors?.map(sc => ({
                ticketServiceId: sc.ticketServiceId,
                color: sc.color
            }))
        };
        updateSettings(formattedData);
    };

    const isPageLoading = isSettingsLoading;

    if (isPageLoading) {
        return <Typography sx={{ p: 4 }}>Đang tải dữ liệu...</Typography>;
    }

    return (
        <Box sx={{ width: '100%', mx: 'auto' }}>
            <Box sx={{ mb: 5 }}>
                <Title title="Cài đặt hệ thống" />
                <Breadcrumb
                    items={[
                        { label: "Dashboard", to: "/" },
                        { label: "Cài đặt" }
                    ]}
                />
            </Box>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Stack spacing={3}>
                            <Card sx={{ p: 4, textAlign: 'center', borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)", bgcolor: "var(--palette-background-paper)" }}>
                                <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 700, fontSize: '0.875rem' }}>Logo Website</Typography>
                                <Box
                                    onClick={handleOpenFile}
                                    sx={{
                                        width: 144,
                                        height: 144,
                                        mx: 'auto',
                                        cursor: 'pointer',
                                        borderRadius: '50%',
                                        border: '1px dashed rgba(145, 158, 171, 0.32)',
                                        p: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: 'rgba(145, 158, 171, 0.08)',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        '&:hover': { opacity: 0.72 }
                                    }}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                    {logo ? (
                                        <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
                                            <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            <Box sx={{
                                                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                bgcolor: 'rgba(0,0,0,0.4)', opacity: 0, '&:hover': { opacity: 1 }, transition: '0.2s', color: 'white'
                                            }}>
                                                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>Thay đổi</Typography>
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Stack spacing={1} alignItems="center" sx={{ color: 'var(--palette-text-secondary)' }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="m12 10.25a.75.75 0 0 1 .75.75v1.25H14a.75.75 0 0 1 0 1.5h-1.25V15a.75.75 0 0 1-1.5 0v-1.25H10a.75.75 0 0 1 0-1.5h1.25V11a.75.75 0 0 1 .75-.75"></path><path fill="currentColor" d="M9.778 21h4.444c3.121 0 4.682 0 5.803-.735a4.4 4.4 0 0 0 1.226-1.204c.749-1.1.749-2.633.749-5.697s0-4.597-.749-5.697a4.4 4.4 0 0 0-1.226-1.204c-.72-.473-1.622-.642-3.003-.702c-.659 0-1.226-.49-1.355-1.125A2.064 2.064 0 0 0 13.634 3h-3.268c-.988 0-1.839.685-2.033 1.636c-.129.635-.696 1.125-1.355 1.125c-1.38.06-2.282.23-3.003.702A4.4 4.4 0 0 0 2.75 7.667C2 8.767 2 10.299 2 13.364s0 4.596.749 5.697c.324.476.74.885 1.226 1.204C5.096 21 6.657 21 9.778 21M16 13a4 4 0 1 1-8 0a4 4 0 0 1 8 0m2-3.75a.75.75 0 0 0 0 1.5h1a.75.75 0 0 0 0-1.5z"></path></svg>
                                            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>{isUploading ? "Đang tải..." : "Tải logo"}</Typography>
                                        </Stack>
                                    )}
                                </Box>
                                <Typography variant="body2" sx={{ mt: 3, color: 'var(--palette-text-disabled)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                                    Định dạng cho phép *.jpeg, *.jpg, *.png, *.gif
                                    <br />
                                    Dung lượng tối đa 3 Mb
                                </Typography>
                            </Card>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, md: 8 }}>
                        <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)", bgcolor: "var(--palette-background-paper)" }}>
                            <Typography variant="subtitle1" sx={{ mb: 4, fontWeight: 700, fontSize: '0.875rem' }}>Thông tin chung</Typography>

                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Controller
                                        name="websiteName"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Tên Website"
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Controller
                                        name="phone"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Số điện thoại"
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Controller
                                        name="email"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Email liên hệ"
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Controller
                                        name="defaultPassword"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Mật khẩu mặc định"
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Controller
                                        name="address"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Địa chỉ"
                                                fullWidth
                                                multiline
                                                rows={2}
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Controller
                                        name="copyright"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Bản quyền (Copyright)"
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>


                            <Box sx={{ mt: 5 }}>
                                <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 700, fontSize: '0.875rem' }}>Mạng xã hội</Typography>
                                <Stack spacing={3}>
                                    <Controller
                                        name="facebook"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Facebook URL"
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="instagram"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Instagram URL"
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                </Stack>
                            </Box>

                            <Box sx={{ mt: 5 }}>
                                <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 700, fontSize: '0.875rem' }}>Các điều khoản & Chính sách</Typography>
                                <Stack spacing={3}>
                                    <Box>
                                        <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600 }}>Chính sách bảo mật (Privacy Policy)</Typography>
                                        <Controller
                                            name="privacyPolicy"
                                            control={control}
                                            render={({ field }) => (
                                                <Tiptap value={field.value} onChange={field.onChange} />
                                            )}
                                        />
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600 }}>Điều khoản sử dụng (Terms of Use)</Typography>
                                        <Controller
                                            name="termsOfUse"
                                            control={control}
                                            render={({ field }) => (
                                                <Tiptap value={field.value} onChange={field.onChange} />
                                            )}
                                        />
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600 }}>Điều kiện & Quy định (Conditions)</Typography>
                                        <Controller
                                            name="conditions"
                                            control={control}
                                            render={({ field }) => (
                                                <Tiptap value={field.value} onChange={field.onChange} />
                                            )}
                                        />
                                    </Box>
                                </Stack>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 5 }}>
                                <LoadingButton
                                    type="submit"
                                    loading={isSubmitting}
                                    label="Lưu cài đặt"
                                    loadingLabel="Đang lưu..."
                                    sx={{
                                        minWidth: 140,
                                        height: 48,
                                        fontSize: '0.9375rem',
                                    }}
                                />
                            </Box>
                        </Card>
                    </Grid>
                </Grid>
            </form>
        </Box >
    );
};




