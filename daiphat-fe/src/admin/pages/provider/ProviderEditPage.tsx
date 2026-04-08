import { Box, Stack, TextField, ThemeProvider, useTheme, CircularProgress } from "@mui/material";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { Tiptap } from "../../components/layouts/titap/Tiptap";
import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { useProviderDetail, useUpdateProvider } from "./hooks/useProvider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { createProviderSchema, CreateProviderFormValues } from "../../schemas/provider.schema";
import { SwitchButton } from "../../components/ui/SwitchButton";
import { getProviderTheme } from "./configs/theme";
import { prefixAdmin } from "../../constants/routes";
import { FormUploadSingleFile } from "../../components/upload/FormUploadSingleFile";
import { toast } from "react-toastify";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { useParams } from "react-router-dom";

export const ProviderEditPage = () => {
    const { id } = useParams();
    const [expandedDetail, setExpandedDetail] = useState(true);

    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);

    const outerTheme = useTheme();
    const localTheme = getProviderTheme(outerTheme);

    const { data: detailRes, isLoading: isLoadingDetail } = useProviderDetail(id);
    const { mutate: update, isPending: isUpdating } = useUpdateProvider();

    const {
        control,
        handleSubmit,
        reset,
    } = useForm<CreateProviderFormValues>({
        resolver: zodResolver(createProviderSchema),
        defaultValues: {
            name: "",
            description: "",
            status: "active",
            avatar: "",
        },
    });

    useEffect(() => {
        if (detailRes) {
            reset({
                name: detailRes.name || "",
                description: detailRes.description || "",
                status: detailRes.status || "active",
                avatar: detailRes.avatar || "",
            });
        }
    }, [detailRes, reset]);

    const onSubmit = (data: CreateProviderFormValues) => {
        update({ id: id!, data }, {
            onSuccess: (response) => {
                if (response.success) {
                    toast.success(response.message || "Cập nhật nhà đài thành công");
                } else {
                    toast.error(response.message);
                }
            },
            onError: () => {
                toast.error("Có lỗi xảy ra trong quá trình cập nhật");
            }
        });
    };

    if (isLoadingDetail) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress color="inherit" />
            </Box>
        );
    }

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Chỉnh sửa nhà đài" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Nhà đài", to: `/${prefixAdmin}/provider/list` },
                            { label: "Chỉnh sửa" }
                        ]}
                    />
                </div>
            </div>

            <ThemeProvider theme={localTheme}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Stack sx={{ margin: "0px calc(15 * var(--spacing))", gap: "calc(5 * var(--spacing))" }}>
                        <CollapsibleCard
                            title="Chi tiết"
                            subheader="Cập nhật tiêu đề, mô tả và hình ảnh nhà đài"
                            expanded={expandedDetail}
                            onToggle={toggle(setExpandedDetail)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))" }}>
                                    <Controller
                                        name="name"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Tên nhà đài"
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Box>

                                <Controller
                                    name="description"
                                    control={control}
                                    render={({ field }) => (
                                        <Tiptap
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                        />
                                    )}
                                />

                                <FormUploadSingleFile
                                    name="avatar"
                                    control={control}
                                />
                            </Stack>
                        </CollapsibleCard>

                        <Box gap="calc(3 * var(--spacing))" sx={{ display: "flex", alignItems: "center" }}>
                            <SwitchButton
                                control={control}
                                name="status"
                                checkedValue="active"
                                uncheckedValue="inactive"
                            />
                            <LoadingButton
                                type="submit"
                                loading={isUpdating}
                                label="Cập nhật nhà đài"
                                loadingLabel="Đang cập nhật..."
                                sx={{ minHeight: "3rem", minWidth: "4rem" }}
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    );
};
