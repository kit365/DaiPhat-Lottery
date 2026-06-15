import { Box, Stack, TextField, ThemeProvider, useTheme, CircularProgress } from "@mui/material";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { Tiptap } from "../../components/layouts/titap/Tiptap";
import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { useTicketCategoryDetail, useNestedTicketCategories, useUpdateTicketCategory } from "./hooks/useTicketCategory";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { createTicketCategorySchema, CreateTicketCategoryFormValues } from "../../schemas/ticket-category.schema";
import { SwitchButton } from "../../components/ui/SwitchButton";
import { getTicketCategoryTheme } from "./configs/theme";
import { prefixAdmin } from "../../constants/routes";
import { FormUploadSingleFile } from "../../components/upload/FormUploadSingleFile";
import { uploadAdminImage } from "../../api/upload.api";
import { toast } from "react-toastify";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { CategoryParentSelect } from "../../components/ui/CategoryTreeSelect";
import { useParams } from "react-router-dom";

export const TicketCategoryEditPage = () => {
    const { id } = useParams();
    const [expandedDetail, setExpandedDetail] = useState(true);

    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);

    const outerTheme = useTheme();
    const localTheme = getTicketCategoryTheme(outerTheme);

    const { data: detailRes, isLoading: isLoadingDetail } = useTicketCategoryDetail(id);
    const { data: nestedCategories = [] } = useNestedTicketCategories();

    const { mutate: update, isPending: isUpdating } = useUpdateTicketCategory();
    const uploadImage = useCallback(async (file: File) => uploadAdminImage(file), []);

    const {
        control,
        handleSubmit,
        reset,
    } = useForm<CreateTicketCategoryFormValues>({
        resolver: zodResolver(createTicketCategorySchema),
        defaultValues: {
            name: "",
            description: "",
            parent: "",
            status: "active",
            avatar: "",
        },
    });

    // 3. Đổ dữ liệu vào Form khi có dữ liệu từ Detail API
    useEffect(() => {
        if (detailRes && detailRes._id) {
            const detail = detailRes;
            reset({
                name: detail.name || "",
                description: detail.description || "",
                // Convert sang string để Select Component nhận diện đúng
                // Xử lý trường hợp parent là object (populated) hoặc string (id)
                parent: detail.parent
                    ? (typeof detail.parent === 'object' ? (detail.parent as any)._id : String(detail.parent))
                    : "",
                status: detail.status || "active",
                avatar: detail.avatar || "",
            });
        }
    }, [detailRes, reset]);

    const onSubmit = (data: CreateTicketCategoryFormValues) => {
        // Gom dữ liệu form + categoryId để gửi lên (Backend dùng chung POST để Edit)
        const payload = {
            ...data,
            parent: data.parent === "" ? null : data.parent
        };

        update({ id: id!, data: payload }, {
            onSuccess: (response) => {
                if (response.success) {
                    toast.success(response.message || "Cập nhật thành công");
                } else {
                    toast.error(response.message || "Cập nhật thất bại");
                }
            },
            onError: (err: any) => {
                toast.error(err?.response?.data?.message || err?.message || "Có lỗi xảy ra trong quá trình cập nhật");
            }
        });
    };

    // Hiển thị loading khi đang tải dữ liệu ban đầu
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
                    <Title title="Chỉnh sửa Miền/Tỉnh thành" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Miền/Tỉnh thành", to: `/${prefixAdmin}/ticket-category/list` },
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
                            subheader="Cập nhật tên, mô tả và hình ảnh..."
                            expanded={expandedDetail}
                            onToggle={toggle(setExpandedDetail)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))" }}>
                                    <Controller
                                        name="name"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Tên Miền/Tỉnh thành"
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                                fullWidth
                                            />
                                        )}
                                    />
                                    <CategoryParentSelect
                                        control={control}
                                        categories={nestedCategories}
                                        excludedId={id}
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
                                loading={isUpdating}
                                label="Cập nhật Miền/Tỉnh thành"
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
