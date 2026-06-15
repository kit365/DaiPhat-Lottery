import { Box, Stack, TextField, ThemeProvider, useTheme } from "@mui/material"
import { Breadcrumb } from "../../components/ui/Breadcrumb"
import { Title } from "../../components/ui/Title"
import { Tiptap } from "../../components/layouts/titap/Tiptap"
import { useState, useMemo, useCallback, type Dispatch, type SetStateAction } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { useCreateTicketCategory, useNestedTicketCategories } from "./hooks/useTicketCategory";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { SwitchButton } from "../../components/ui/SwitchButton";
import { getTicketCategoryTheme } from "./configs/theme";
import { prefixAdmin } from "../../constants/routes";
import { FormUploadSingleFile } from "../../components/upload/FormUploadSingleFile";
import { uploadAdminImage } from "../../api/upload.api";
import { toast } from "react-toastify";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { CategoryParentSelect } from "../../components/ui/CategoryTreeSelect";
import { useTranslation } from "react-i18next";
import { z } from "zod";

export const TicketCategoryCreatePage = () => {
    const { t } = useTranslation();

    const createCategorySchema = useMemo(() => z.object({
        name: z
            .string()
            .min(1, "Tên miền/tỉnh thành không được để trống")
            .max(100),
        description: z.string().optional(),
        parent: z.string().optional(),
        status: z.enum(["active", "inactive"]).default("active"),
        avatar: z.string().min(1, "Vui lòng chọn hình ảnh đại diện"),
    }), []);

    const [expandedDetail, setExpandedDetail] = useState(true);
    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);

    const outerTheme = useTheme();
    const localTheme = getTicketCategoryTheme(outerTheme);

    const {
        control,
        handleSubmit,
        reset
    } = useForm<any>({
        resolver: zodResolver(createCategorySchema),
        defaultValues: {
            name: "",
            description: "",
            parent: "",
            status: "active",
            avatar: "",
        },
    });

    // Lấy danh mục dạng cây
    const {
        data: nestedCategories = [],
    } = useNestedTicketCategories();

    // Tạo
    const { mutate: create, isPending } = useCreateTicketCategory();
    const uploadImage = useCallback(async (file: File) => uploadAdminImage(file), []);

    const onSubmit = (data: any) => {
        create(data, {
            onSuccess: (response) => {
                if (response.success) {
                    toast.success(response.message || "Tạo thành công");
                    reset({
                        name: "",
                        description: "",
                        parent: "",
                        status: "active",
                        avatar: "",
                    });
                } else {
                    toast.error(response.message);
                }

            },
            onError: () => {
                toast.error("Tạo thất bại");
            }
        });
    };

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Tạo mới Miền/Tỉnh thành" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Miền/Tỉnh thành", to: `/${prefixAdmin}/ticket-category/list` },
                            { label: "Tạo mới" }
                        ]}
                    />
                </div>
            </div>
            <ThemeProvider theme={localTheme}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Stack sx={{
                        margin: "0px calc(15 * var(--spacing))",
                        gap: "calc(5 * var(--spacing))"
                    }}>
                        <CollapsibleCard
                            title="Chi tiết"
                            subheader="Tên miền, mô tả và hình ảnh..."
                            expanded={expandedDetail}
                            onToggle={toggle(setExpandedDetail)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(2, 1fr)",
                                        gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))",
                                    }}
                                >
                                    <Controller
                                        name="name"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Tên Miền/Tỉnh thành"
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                    <CategoryParentSelect
                                        control={control}
                                        categories={nestedCategories}
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
                                    customUpload={uploadImage}
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
                                loading={isPending}
                                label="Tạo Miền/Tỉnh thành"
                                loadingLabel="Đang tạo..."
                                sx={{ minHeight: "3rem", minWidth: "4rem" }}
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>

        </>
    )
}
