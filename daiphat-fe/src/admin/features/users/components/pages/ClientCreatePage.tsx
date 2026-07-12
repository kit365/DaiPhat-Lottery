import { Breadcrumb } from '../../../../components/ui/Breadcrumb';
import { Title } from '../../../../components/ui/Title';
import { useCreateUser, useUploadUserAvatar } from "../../hooks/useUsers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { accountUserSchema } from "../../../../schemas/account-user.schema";
import { prefixAdmin } from '../../../../constants/routes';
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
    Box,
    TextField,
    Card,
    Stack,
    Alert,
    AlertTitle
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { LoadingButton } from '../../../../components/ui/LoadingButton';

export const ClientCreatePage = () => {
    const navigate = useNavigate();
    const { mutateAsync: create, isPending } = useCreateUser();
    const { mutateAsync: uploadAvatar } = useUploadUserAvatar();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState("");

    const {
        control,
        handleSubmit,
    } = useForm<any>({
        resolver: zodResolver(accountUserSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
        },
    });

    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        };
    }, [avatarPreview]);

    const handleOpenFile = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Định dạng file không hợp lệ. Vui lòng chọn *.jpeg, *.jpg, *.png, hoặc *.gif");
            event.target.value = "";
            return;
        }

        const maxSize = 3 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error("Dung lượng file quá lớn. Tối đa là 3 Mb");
            event.target.value = "";
            return;
        }

        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        event.target.value = "";
    };

    const onSubmit = async (data: any) => {
        try {
            const response = await create(data);
            const userId = response.data?.id;

            if (avatarFile && userId) {
                try {
                    setIsUploading(true);
                    await uploadAvatar({ id: String(userId), file: avatarFile });
                } catch {
                    toast.warning("Tài khoản đã được tạo nhưng tải ảnh đại diện thất bại.");
                } finally {
                    setIsUploading(false);
                }
            }

            toast.success("Tạo tài khoản khách hàng thành công!");
            navigate(`/${prefixAdmin}/account-user/list`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Tạo thất bại");
        }
    };

    return (
        <Box sx={{ p: 3, pt: 2, display: "flex", flexDirection: "column", gap: 3, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Title title="Tạo tài khoản khách hàng mới" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: `/${prefixAdmin}` },
                            { label: "Khách hàng", to: `/${prefixAdmin}/account-user/list` },
                            { label: "Tạo mới" }
                        ]}
                    />
                </Box>
            </Box>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Card sx={{ 
                            px: "calc(3 * var(--spacing))", 
                            py: "80px", 
                            textAlign: 'center', 
                            borderRadius: '16px',
                            border: '1px solid var(--palette-divider)',
                            boxShadow: 'var(--shadow-sm)',
                            bgcolor: 'var(--palette-background-paper)'
                        }}>
                            <div
                                onClick={handleOpenFile}
                                className="w-[144px] h-[144px] m-auto cursor-pointer rounded-full p-[8px] border border-dashed border-[var(--palette-text-disabled)33] hover:opacity-75 transition-opacity"
                            >
                                <div className="w-full h-full rounded-full relative overflow-hidden bg-[var(--palette-text-disabled)14]">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                    {avatarPreview ? (
                                        <img
                                            src={avatarPreview}
                                            alt="avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-[var(--palette-text-disabled)] flex-col gap-[8px]">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true" role="img" className="w-[2rem] h-[2rem]" id="_r_fh_" width="1rem" height="1rem" viewBox="0 0 24 24"><g fill="currentColor" fillRule="evenodd" clipRule="evenodd"><path d="M12 10.25a.75.75 0 0 1 .75.75v1.25H14a.75.75 0 0 1 0 1.5h-1.25V15a.75.75 0 0 1-1.5 0v-1.25H10a.75.75 0 0 1 0-1.5h1.25V11a.75.75 0 0 1 .75-.75"></path><path d="M9.778 21h4.444c3.121 0 4.682 0 5.803-.735a4.4 4.4 0 0 0 1.226-1.204c.749-1.1.749-2.633.749-5.697s0-4.597-.749-5.697a4.4 4.4 0 0 0-1.226-1.204c-.72-.473-1.622-.642-3.003-.702c-.659 0-1.226-.49-1.355-1.125A2.064 2.064 0 0 0 13.634 3h-3.268c-.988 0-1.839.685-2.033 1.636c-.129.635-.696 1.125-1.355 1.125c-1.38.06-2.282.23-3.003.702A4.4 4.4 0 0 0 2.75 7.667C2 8.767 2 10.299 2 13.364s0 4.596.749 5.697c.324.476.74.885 1.226 1.204C5.096 21 6.657 21 9.778 21M16 13a4 4 0 1 1-8 0a4 4 0 0 1 8 0m2-3.75a.75.75 0 0 0 0 1.5h1a.75.75 0 0 0 0-1.5z"></path></g></svg>
                                            <span className="text-[0.75rem]">{isUploading ? "Đang tải..." : "Tải ảnh lên"}</span>
                                        </div>
                                    )}

                                    {avatarPreview && (
                                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-white flex-col gap-[8px] bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-200">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true" role="img" className="w-[2rem] h-[2rem]" id="_r_fh_" width="1rem" height="1rem" viewBox="0 0 24 24"><g fill="currentColor" fillRule="evenodd" clipRule="evenodd"><path d="M12 10.25a.75.75 0 0 1 .75.75v1.25H14a.75.75 0 0 1 0 1.5h-1.25V15a.75.75 0 0 1-1.5 0v-1.25H10a.75.75 0 0 1 0-1.5h1.25V11a.75.75 0 0 1 .75-.75"></path><path d="M9.778 21h4.444c3.121 0 4.682 0 5.803-.735a4.4 4.4 0 0 0 1.226-1.204c.749-1.1.749-2.633.749-5.697s0-4.597-.749-5.697a4.4 4.4 0 0 0-1.226-1.204c-.72-.473-1.622-.642-3.003-.702c-.659 0-1.226-.49-1.355-1.125A2.064 2.064 0 0 0 13.634 3h-3.268c-.988 0-1.839.685-2.033 1.636c-.129.635-.696 1.125-1.355 1.125c-1.38.06-2.282.23-3.003.702A4.4 4.4 0 0 0 2.75 7.667C2 8.767 2 10.299 2 13.364s0 4.596.749 5.697c.324.476.74.885 1.226 1.204C5.096 21 6.657 21 9.778 21M16 13a4 4 0 1 1-8 0a4 4 0 0 1 8 0m2-3.75a.75.75 0 0 0 0 1.5h1a.75.75 0 0 0 0-1.5z"></path></g></svg>
                                            <span className="text-[0.75rem]">Thay đổi ảnh</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-[0.75rem] text-[var(--palette-text-disabled)] mt-[24px]">
                                Định dạng cho phép *.jpeg, *.jpg, *.png, *.gif
                                <br />
                                Dung lượng tối đa 3 Mb
                            </div>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={8}>
                        <Card sx={{ 
                            p: 4, 
                            borderRadius: '16px',
                            border: '1px solid var(--palette-divider)',
                            boxShadow: 'var(--shadow-sm)',
                            bgcolor: 'var(--palette-background-paper)'
                        }}>
                            <Box sx={{ mb: 3 }}>
                                <Alert severity="info" sx={{ borderRadius: "var(--shape-borderRadius)" }}>
                                    <AlertTitle>Thông tin mật khẩu</AlertTitle>
                                    Mật khẩu sẽ được hệ thống <strong>tự động tạo</strong> và gửi về email của người dùng. Người dùng sẽ được yêu cầu đổi mật khẩu trong lần đăng nhập đầu tiên.
                                </Alert>
                            </Box>

                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
                                <Controller
                                    name="lastName"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextField
                                            {...field}
                                            label="Họ"
                                            fullWidth
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)", fontSize: '0.875rem' } }}
                                        />
                                    )}
                                />

                                <Controller
                                    name="firstName"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextField
                                            {...field}
                                            label="Tên"
                                            fullWidth
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)", fontSize: '0.875rem' } }}
                                        />
                                    )}
                                />

                                <Controller
                                    name="email"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextField
                                            {...field}
                                            label="Email"
                                            fullWidth
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)", fontSize: '0.875rem' } }}
                                        />
                                    )}
                                />



                            </Box>

                            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
                                <LoadingButton
                                    type="submit"
                                    loading={isPending || isUploading}
                                    label="Tạo tài khoản khách hàng"
                                    loadingLabel={isUploading ? "Đang tải ảnh..." : "Đang tạo..."}
                                />
                            </Stack>
                        </Card>
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
};


