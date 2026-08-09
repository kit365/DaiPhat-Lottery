"use client";

import { Box, Stack, TextField, ThemeProvider, useTheme, MenuItem, Select, FormControl, InputLabel, FormHelperText, createTheme, Autocomplete, CircularProgress } from "@mui/material"
import { Button } from "../../../../components/ui/Button";
import { PageHeader } from "../../../../components/ui/PageHeader"
import { useState, type Dispatch, type SetStateAction } from "react"
import { Tiptap } from "../../../../components/layouts/titap/Tiptap"
import { CollapsibleCard } from "../../../../components/ui/CollapsibleCard"
import { useCreateBlog, useBlogTypes, useBlogStatuses } from "../../hooks/useBlog";
import { useBlogTags } from "../../hooks/useBlogTag";
import { uploadBlogImage } from "../../services/blogService"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { createBlogSchema, CreateBlogFormValues } from "../../schemas/blog.schema";
import { FormUploadSingleFile } from "../../../../components/upload/FormUploadSingleFile"
import { AppToast as toast } from "../../../../../utils/toast.util";
import { prefixAdmin } from "../../../../constants/routes"
import { BLOG_STATUS } from '../../types/blog.type';

import { useNestedBlogCategories } from "../../hooks/useBlogCategory";
import { CategoryTreeSelectGeneric } from "../../../../components/ui/CategoryTreeSelectGeneric";
import { getMinScheduleValue } from "../utils/blogForm.utils";

export const BlogCreatePage = () => {
    const [expandedDetail, setExpandedDetail] = useState(true);
    const [expandedExtra, setExpandedExtra] = useState(true);
    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);




    const { data: blogCategories = [] } = useNestedBlogCategories();
    const { data: blogTags = [], isLoading: isLoadingTags } = useBlogTags();
    const { data: blogTypes = [] } = useBlogTypes();
    const { data: blogStatuses = [] } = useBlogStatuses();
    const creatableBlogStatuses = blogStatuses.filter((status) => status.value !== "unpublished");
    const { mutate: create, isPending } = useCreateBlog();
    const [isUploading, setIsUploading] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        watch,
    } = useForm<CreateBlogFormValues>({
        resolver: zodResolver(createBlogSchema) as any,
        defaultValues: {
            name: "",
            description: "",
            content: "",
            avatar: "",
            category: [],
            status: "draft",
            type: "blog",
            tags: [],
            scheduledAt: null,
        },
    });
    const selectedStatus = watch("status");

    const onSubmit = async (data: CreateBlogFormValues) => {
        try {
            setIsUploading(true);
            let imageUrl = data.avatar;

            if (data.avatar instanceof File) {
                const uploadRes = await uploadBlogImage(data.avatar, 'blog-content');
                if (uploadRes.success && uploadRes.data?.url) {
                    imageUrl = uploadRes.data.url;
                } else {
                    toast.error(uploadRes.message || "Tải ảnh lên thất bại");
                    return;
                }
            }

                        const payload = {
                title: data.name,
                summary: data.description,
                content: data.content,
                thumbnail: imageUrl,
                categoryId: data.category.length > 0 ? Number(data.category[0]) : null,
                status: data.status,
                type: data.type,
                tagIds: data.tags ? data.tags.map(t => Number(t)) : [],
                scheduledAt: data.status === BLOG_STATUS.SCHEDULED ? data.scheduledAt : null
            };

            create(payload, {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success(response.message || "Tạo bài viết thành công");
                        reset();
                    } else {
                        toast.error(response.message || "Tạo bài viết thất bại");
                    }
                },
                onError: () => {
                    toast.error("Tạo bài viết thất bại");
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
                title="Tạo mới bài viết"
                breadcrumbItems={[
                            { label: "Bảng điều khiển", to: "/" },
                            { label: "Danh sách bài viết", to: `/${prefixAdmin}/blog/list` },
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
                            title="Thông tin chung"
                            subheader="Mô tả"
                            expanded={expandedDetail}
                            onToggle={toggle(setExpandedDetail)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Controller
                                    name="name"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextField
                                            {...field}
                                            label="Tiêu đề bài viết"
                                            fullWidth
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                        />
                                    )}
                                />
                                <Controller
                                    name="description"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextField
                                            {...field}
                                            label="Mô tả ngắn"
                                            multiline
                                            rows={4}
                                            fullWidth
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                            sx={{}}
                                        />
                                    )}
                                />
                                <Controller
                                    name="content"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Box>
                                            <Tiptap
                                                value={field.value ?? ""}
                                                onChange={field.onChange}
                                            />
                                            {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
                                        </Box>
                                    )}
                                />
                                <FormUploadSingleFile
                                    name="avatar"
                                    control={control}
                                    useRawFile={true}
                                />
                            </Stack>
                        </CollapsibleCard>
                        <CollapsibleCard
                            title="Thuộc tính"
                            subheader="Mô tả"
                            expanded={expandedExtra}
                            onToggle={toggle(setExpandedExtra)}
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
                                        name="status"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControl fullWidth>
                                                <InputLabel id="status-select-label">Trạng thái</InputLabel>
                                                <Select
                                                    {...field}
                                                    labelId="status-select-label"
                                                    label="Trạng thái"
                                                >
                                                    {creatableBlogStatuses.map((opt) => (
                                                        <MenuItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        )}
                                    />
                                    <Controller
                                        name="type"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <FormControl fullWidth error={!!fieldState.error}>
                                                <InputLabel id="type-select-label">Loại bài viết</InputLabel>
                                                <Select
                                                    {...field}
                                                    labelId="type-select-label"
                                                    label="Loại bài viết"
                                                >
                                                    {blogTypes.map((opt) => (
                                                        <MenuItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                                {fieldState.error && (
                                                    <FormHelperText>{fieldState.error.message}</FormHelperText>
                                                )}
                                            </FormControl>
                                        )}
                                    />
                                    <Box
                                        sx={{
                                            gridColumn: selectedStatus !== BLOG_STATUS.SCHEDULED ? "span 2" : "span 1"
                                        }}
                                    >
                                        <CategoryTreeSelectGeneric
                                            control={control}
                                            categories={blogCategories}
                                            name="category"
                                            label="Danh mục bài viết"
                                            placeholder="Chọn danh mục"
                                            multiple={true}
                                        />
                                    </Box>
                                    {selectedStatus === BLOG_STATUS.SCHEDULED && (
                                        <Controller
                                            name="scheduledAt"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    value={field.value ?? ""}
                                                    label="Lên lịch xuất bản"
                                                    type="datetime-local"
                                                    fullWidth
                                                    InputLabelProps={{ shrink: true }}
                                                    inputProps={{ min: getMinScheduleValue() }}
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message || "Chọn thời điểm bài viết tự động được xuất bản."}
                                                />
                                            )}
                                        />
                                    )}
                                    <Controller
                                        name="tags"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Autocomplete
                                                multiple
                                                options={blogTags}
                                                getOptionLabel={(option: any) => option.name || ""}
                                                loading={isLoadingTags}
                                                value={blogTags.filter((tag: any) => field.value?.includes(tag.id))}
                                                onChange={(_e, newValue) => {
                                                    field.onChange(newValue.map((tag: any) => tag.id));
                                                }}
                                                sx={{ gridColumn: "span 2" }}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Tags"
                                                        placeholder="+ Tags"
                                                        error={!!fieldState.error}
                                                        helperText={fieldState.error?.message}
                                                        InputProps={{
                                                            ...params.InputProps,
                                                            endAdornment: (
                                                                <>
                                                                    {isLoadingTags ? <CircularProgress color="inherit" size={20} /> : null}
                                                                    {params.InputProps.endAdornment}
                                                                </>
                                                            ),
                                                        }}
                                                    />
                                                )}
                                            />
                                        )}
                                    />
                                </Box>
                            </Stack>
                        </CollapsibleCard>
                        <Box gap="calc(3 * var(--spacing))" sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                            <Button
                                type="submit"
                                loading={isPending || isUploading}
                                label="Tạo mới bài viết"
                                loadingLabel="Đang xử lý..."
                            />
                        </Box>
                    </Stack>
                </form>
            </>

        </>
    )
}
