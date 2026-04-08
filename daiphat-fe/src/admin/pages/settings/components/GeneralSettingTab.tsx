import { Box, Card, Grid, TextField, Button, Typography, Stack } from "@mui/material";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingGeneralSchema, SettingGeneralFormValues } from "../../../schemas/setting.schema";
import { useSettingGeneral, useUpdateSettingGeneral } from "../hooks/useSettings";
import { useEffect } from "react";
import { FormUploadSingleFile } from "../../../components/upload/FormUploadSingleFile";

export const GeneralSettingTab = () => {
    const { data: generalData, isLoading: isSettingsLoading } = useSettingGeneral();
    const { mutate: updateGeneral, isPending } = useUpdateSettingGeneral();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<SettingGeneralFormValues>({
        resolver: zodResolver(settingGeneralSchema) as any,
        defaultValues: {
            websiteName: "",
            websiteDomain: "",
            logo: "",
            favicon: "",
            phone: "",
            email: "",
            address: "",
            copyright: "",
            facebook: "",
            instagram: "",
            ticketSubtypes: [],
            defaultPassword: ""
        }
    });

    const { fields: ticketSubtypeFields, append: appendTicketSubtype, remove: removeTicketSubtype } = useFieldArray({
        control,
        name: "ticketSubtypes"
    });

    useEffect(() => {
        if (generalData) {
            reset({
                ...generalData,
                websiteDomain: generalData.websiteDomain || "",
                favicon: generalData.favicon || "",
                ticketSubtypes: generalData.ticketSubtypes || [],
                defaultPassword: generalData.defaultPassword || ""
            });
        }
    }, [generalData, reset]);

    const onSubmit = (data: SettingGeneralFormValues) => {
        updateGeneral(data);
    };

    if (isSettingsLoading) return <Typography>Đang tải...</Typography>;

    return (
        <Stack spacing={3}>
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                    {/* Website Info */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card sx={{ p: 3, borderRadius: "16px", height: "100%", boxShadow: "var(--customShadows-card)" }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>Thông tin Website</Typography>
                            <Stack spacing={2.5}>
                                <Controller
                                    name="websiteName"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="Tên Website" error={!!errors.websiteName} helperText={errors.websiteName?.message} />
                                    )}
                                />
                                <Controller
                                    name="websiteDomain"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="Tên miền Website" error={!!errors.websiteDomain} helperText={errors.websiteDomain?.message} />
                                    )}
                                />
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Logo Website</Typography>
                                    <FormUploadSingleFile
                                        name="logo"
                                        control={control}
                                    />
                                </Box>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Favicon Website</Typography>
                                    <FormUploadSingleFile
                                        name="favicon"
                                        control={control}
                                    />
                                </Box>
                                <Controller
                                    name="phone"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="Số điện thoại" error={!!errors.phone} helperText={errors.phone?.message} />
                                    )}
                                />
                                <Controller
                                    name="email"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="Email" error={!!errors.email} helperText={errors.email?.message} />
                                    )}
                                />
                                <Controller
                                    name="address"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth multiline rows={2} label="Địa chỉ" error={!!errors.address} helperText={errors.address?.message} />
                                    )}
                                />
                                <Controller
                                    name="copyright"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="Bản quyền (Copyright)" error={!!errors.copyright} helperText={errors.copyright?.message} />
                                    )}
                                />
                                <Controller
                                    name="defaultPassword"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            type="password"
                                            label="Mật khẩu mặc định cho khách hàng mới"
                                            error={!!errors.defaultPassword}
                                            helperText={errors.defaultPassword?.message || "Dùng khi tạo tài khoản khách hàng mới"}
                                        />
                                    )}
                                />
                            </Stack>
                        </Card>
                    </Grid>

                    {/* Social Media */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card sx={{ p: 3, borderRadius: "16px", height: "100%", boxShadow: "var(--customShadows-card)" }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>Mạng xã hội</Typography>
                            <Stack spacing={2.5}>
                                <Controller
                                    name="facebook"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Facebook"
                                            InputProps={{ startAdornment: <Icon icon="logos:facebook" width={24} style={{ marginRight: 8 }} /> }}
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
                                            InputProps={{ startAdornment: <Icon icon="logos:instagram-icon" width={24} style={{ marginRight: 8 }} /> }}
                                        />
                                    )}
                                />
                            </Stack>

                        </Card>
                    </Grid>

                    {/* TicketSubtypes Section */}
                    <Grid size={{ xs: 12 }}>
                        <Card sx={{ p: 3, borderRadius: "16px", boxShadow: "var(--customShadows-card)" }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Danh sách Giống thú cưng (theo UserTicket)</Typography>
                                <Button
                                    variant="contained"
                                    component={Link}
                                    to="/admin/settings/ticketSubtype/list"
                                    startIcon={<Icon icon="eva:list-fill" />}
                                    sx={{ background: "#1C252E", "&:hover": { background: "#454F5B" } }}
                                >
                                    Quản lý giống
                                </Button>
                            </Box>

                            <Grid container spacing={2}>
                                {ticketSubtypeFields.map((field, index) => (
                                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={field.id}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Controller
                                                name={`ticketSubtypes.${index}.name`}
                                                control={control}
                                                render={({ field: nameField }) => (
                                                    <TextField {...nameField} fullWidth size="small" label="Tên giống" />
                                                )}
                                            />
                                            <Controller
                                                name={`ticketSubtypes.${index}.type`}
                                                control={control}
                                                render={({ field: typeField }) => (
                                                    <TextField
                                                        {...typeField}
                                                        select
                                                        size="small"
                                                        sx={{ minWidth: 80 }}
                                                        SelectProps={{ native: true }}
                                                    >
                                                        <option value="dog">Chó</option>
                                                        <option value="cat">Mèo</option>
                                                        <option value="other">Khác</option>
                                                    </TextField>
                                                )}
                                            />
                                            <Button
                                                size="small"
                                                color="error"
                                                onClick={() => removeTicketSubtype(index)}
                                                sx={{ minWidth: 40 }}
                                            >
                                                <Icon icon="solar:trash-bin-trash-bold" width={20} />
                                            </Button>
                                        </Stack>
                                    </Grid>
                                ))}
                                <Grid size={{ xs: 12 }}>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        startIcon={<Icon icon="eva:plus-fill" />}
                                        onClick={() => appendTicketSubtype({ name: "", type: "dog" })}
                                        sx={{
                                            mt: 2,
                                            borderStyle: "dashed",
                                            borderColor: "var(--palette-text-disabled)",
                                            color: "var(--palette-text-secondary)"
                                        }}
                                    >
                                        Thêm giống mẫu nhanh
                                    </Button>
                                </Grid>
                            </Grid>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={isPending}
                                sx={{
                                    background: "#1C252E",
                                    px: 6,
                                    py: 1.5,
                                    borderRadius: "12px",
                                    fontWeight: 700,
                                    fontSize: "1rem",
                                    textTransform: "none",
                                    boxShadow: "0 8px 16px rgba(28, 37, 46, 0.24)",
                                    "&:hover": {
                                        background: "#454F5B",
                                        boxShadow: "none"
                                    }
                                }}
                            >
                                {isPending ? "Đang lưu..." : "Lưu cài đặt chung"}
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </Stack>
    );
};
