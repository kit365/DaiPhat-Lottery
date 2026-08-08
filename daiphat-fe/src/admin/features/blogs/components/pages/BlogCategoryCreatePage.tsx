"use client";

import { Box, MenuItem, Stack, TextField, ThemeProvider, useTheme } from "@mui/material"
import { LoadingButton } from "../../../../components/ui/LoadingButton";
import { PageHeader } from "../../../../components/ui/PageHeader"
import { Tiptap } from "../../../../components/layouts/titap/Tiptap"
import { useState, type Dispatch, type SetStateAction } from "react";
import { CollapsibleCard } from "../../../../components/ui/CollapsibleCard";
import { useCreateBlogCategory, useNestedBlogCategories, useBlogCategoryStatuses } from "../../hooks/useBlogCategory";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { createCategorySchema, CreateCategoryFormValues } from "../../schemas/blog-category.schema";
import { prefixAdmin } from "../../../../constants/routes";
import { FormUploadSingleFile } from "../../../../components/upload/FormUploadSingleFile";
import { toast } from "react-toastify";
import { CategoryParentSelect } from "../../../../components/ui/CategoryTreeSelect";
import { uploadBlogImage } from "../../services/blogService";

export const BlogCategoryCreatePage = () => {
    const [expandedDetail, setExpandedDetail] = useState(true);
    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);


    const {
        control,
        handleSubmit,
        reset
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

    // Lấy danh mục động từ BE
    const { data: statuses = [] } = useBlogCategoryStatuses();

    // Lấy danh mục dạng cây
    const {
        data: nestedCategories = [],
    } = useNestedBlogCategories();

    // Tạo
    const { mutate: create, isPending } = useCreateBlogCategory();
    const [isUploading, setIsUploading] = useState(false);

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

                        const payload = {
                name: data.name,
                description: data.description,
                parentId: data.parent ? Number(data.parent) : null,
                status: data.status,
                avatar: imageUrl
            };

            create(payload, {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success(response.message);
                        reset({
                            name: "",
                            description: "",
                            parent: "",
                            status: "ACTIVE",
                            avatar: "",
                        });
                    } else {
                        toast.error(response.message);
                    }
                },
                onError: () => {
                    toast.error("Tạo danh mục thất bại");
                }
            });
        } catch (error) {
            console.error(error);
            toast.error("Đã có lỗi xảy ra");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <>
            <PageHeader
                title="Tạo mới danh mục bài viết"
                breadcrumbItems={[
                            { label: "Dashboard", to: "/" },
                            { label: "Danh mục bài viết", to: `/${prefixAdmin}/blog-category/list` },
                            { label: "Tạo mới" }
                        ]}
            />
            <>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Stack sx={{
                        margin: "0px calc(15 * var(--spacing))",
                        gap: "calc(5 * var(--spacing))"
                    }}>
                        <CollapsibleCard
                            title="Chi tiết"
                            subheader="Tiêu đề, mô tả, hình ảnh..."
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
                                                label="Tên danh mục"
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
                                loading={isPending || isUploading}
                                label="Tạo danh mục"
                                loadingLabel="Đang tạo..."
                            />
                        </Box>
                    </Stack>
                </form>
            </>
        </>
    );
};




