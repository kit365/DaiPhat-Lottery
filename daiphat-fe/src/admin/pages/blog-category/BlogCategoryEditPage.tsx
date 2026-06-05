import { Box, MenuItem, Stack, TextField, ThemeProvider, useTheme, CircularProgress } from "@mui/material";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { Tiptap } from "../../components/layouts/titap/Tiptap";
import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { useBlogCategoryDetail, useNestedBlogCategories, useUpdateBlogCategory, useBlogCategoryStatuses } from "./hooks/useBlogCategory";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { createCategorySchema, CreateCategoryFormValues } from "../../schemas/blog-category.schema";
import { getBlogCategoryTheme } from "./configs/theme";
import { prefixAdmin } from "../../constants/routes";
import { FormUploadSingleFile } from "../../components/upload/FormUploadSingleFile";
import { toast } from "react-toastify";
import { CategoryParentSelect } from "../../components/ui/CategoryTreeSelect";
import { uploadBlogImage } from "../../api/blog.api";
import { useParams } from "react-router-dom";

export const BlogCategoryEditPage = () => {
    const { id } = useParams();
    const [expandedDetail, setExpandedDetail] = useState(true);

    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);

    const outerTheme = useTheme();
    const localTheme = getBlogCategoryTheme(outerTheme);

    const { data: detailRes, isLoading: isLoadingDetail } = useBlogCategoryDetail(id);
    const { data: nestedCategories = [] } = useNestedBlogCategories();

    const { mutate: update, isPending: isUpdating } = useUpdateBlogCategory();
    const [isUploading, setIsUploading] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
    } = useForm<CreateCategoryFormValues>({
        resolver: zodResolver(createCategorySchema),
        defaultValues: {
            name: "",
            description: "",
            parent: "",
            status: "ACTIVE",
            avatar: "",
        },
    });

    const { data: statuses = [] } = useBlogCategoryStatuses();

    // 3. Đổ dữ liệu vào Form khi có dữ liệu từ Detail API
    useEffect(() => {
        if (detailRes && detailRes._id) {
            const detail = detailRes;
            reset({
                name: detail.name || "",
                description: detail.description || "",
                parent: detail.parent
                    ? (typeof detail.parent === 'object' ? (detail.parent as any)._id : String(detail.parent))
                    : "",
                status: detail.status,
                avatar: detail.avatar || "",
            });
        }
    }, [detailRes, reset]);

    const onSubmit = async (data: CreateCategoryFormValues) => {
        try {
            setIsUploading(true);
            let imageUrl = data.avatar;

            if (data.avatar instanceof File) {
                const uploadRes = await uploadBlogImage(data.avatar, 'category');
                if (uploadRes.success && uploadRes.data?.url) {
                    imageUrl = uploadRes.data.url;
                } else {
                    toast.error(uploadRes.message || "Tải ảnh lên thất bại");
                    return;
                }
            }

            // Gom dữ liệu form + categoryId để gửi lên (Backend dùng chung POST để Edit)
            const payload = {
                ...data,
                avatar: imageUrl,
                parent: data.parent === "" ? null : data.parent
            };

            update({ id: id!, data: payload }, {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success(response.message || "Cập nhật danh mục thành công");
                    } else {
                        toast.error(response.message);
                    }
                },
                onError: () => {
                    toast.error("Có lỗi xảy ra trong quá trình cập nhật");
                }
            });
        } catch (error) {
            console.error(error);
            toast.error("Đã có lỗi xảy ra");
        } finally {
            setIsUploading(false);
        }
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
                    <Title title="Chỉnh sửa danh mục bài viết" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Danh mục bài viết", to: `/${prefixAdmin}/blog-category/list` },
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
                            subheader="Cập nhật tiêu đề, mô tả và hình ảnh danh mục"
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
                                                label="Tên danh mục"
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
                                    useRawFile={true}
                                />
                            </Stack>
                        </CollapsibleCard>

                        <Box gap="calc(3 * var(--spacing))" sx={{ display: "flex", alignItems: "center" }}>
                            <Controller
                                name="status"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        select
                                        label="Trạng thái"
                                        {...field}
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        sx={{ minWidth: 150 }}
                                    >
                                        {statuses.map((opt) => (
                                            <MenuItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />

                            <LoadingButton
                                type="submit"
                                loading={isUpdating || isUploading}
                                label="Cập nhật danh mục"
                                loadingLabel="Đang cập nhật..."
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    );
};



