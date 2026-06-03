import { Box, Stack, TextField, ThemeProvider, useTheme, CircularProgress, FormControl, InputLabel, Select, MenuItem, FormHelperText, Autocomplete } from "@mui/material";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { Tiptap } from "../../components/layouts/titap/Tiptap";
import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { useBlogDetail, useUpdateBlog, useBlogTags } from "./hooks/useBlog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { createBlogSchema, CreateBlogFormValues } from "../../schemas/blog.schema";
import { prefixAdmin } from "../../constants/routes";
import { FormUploadSingleFile } from "../../components/upload/FormUploadSingleFile";
import { uploadBlogImage } from "../../api/blog.api";
import { toast } from "react-toastify";
import { useParams } from "react-router-dom";
import { useNestedBlogCategories } from "../blog-category/hooks/useBlogCategory";
import { getBlogCategoryTheme } from "../blog-category/configs/theme";
import { CategoryTreeSelectGeneric } from "../../components/ui/CategoryTreeSelectGeneric";

export const BlogEditPage = () => {
    const { id } = useParams();
    const [expandedDetail, setExpandedDetail] = useState(true);
    const [expandedExtra, setExpandedExtra] = useState(true);

    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);

    const outerTheme = useTheme();
    const localTheme = getBlogCategoryTheme(outerTheme);

    const { data: detailRes, isLoading: isLoadingDetail } = useBlogDetail(id);
    const { data: blogCategories = [] } = useNestedBlogCategories();
    const { data: blogTags = [], isLoading: isLoadingTags } = useBlogTags();
    const { mutate: update, isPending: isUpdating } = useUpdateBlog();
    const [isUploading, setIsUploading] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
    } = useForm<CreateBlogFormValues>({
        resolver: zodResolver(createBlogSchema) as any,
        defaultValues: {
            name: "",
            description: "",
            content: "",
            avatar: "",
            category: [],
            status: "draft",
            tags: [],
        },
    });

    useEffect(() => {
        if (detailRes) {
            const detail = detailRes;
            const categoryValue = Array.isArray(detail.category)
                ? detail.category.map((cat: any) => typeof cat === 'object' ? cat._id : cat)
                : [];
            
            const tagValue = Array.isArray(detail.tags)
                ? detail.tags.map((tag: any) => typeof tag === 'object' ? tag.id : tag)
                : [];

            reset({
                name: detail.name || "",
                description: detail.description || "",
                content: detail.content || "",
                avatar: detail.avatar || "",
                category: categoryValue,
                status: detail.status || "draft",
                tags: tagValue,
            });
        }
    }, [detailRes, reset]);

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
                ...data,
                avatar: imageUrl,
                slug: detailRes?.slug,
                category: JSON.stringify(data.category)
            };

            update({ id: id!, data: payload }, {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success(response.message || "Cập nhật bài viết thành công");
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
                    <Title title="Chỉnh sửa bài viết" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Bài viết", to: `/${prefixAdmin}/blog/list` },
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
                            subheader="Cập nhật tiêu đề, mô tả và nội dung bài viết"
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
                                            sx={{
                                                '& .MuiOutlinedInput-input': {
                                                    padding: 0,
                                                },
                                            }}
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
                            subheader="Các thông tin bổ sung và thuộc tính mở rộng"
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
                                                    <MenuItem value="draft">Bản nháp</MenuItem>
                                                    <MenuItem value="published">Xuất bản</MenuItem>
                                                    <MenuItem value="archived">Đã lưu trữ</MenuItem>
                                                </Select>
                                            </FormControl>
                                        )}
                                    />
                                    <CategoryTreeSelectGeneric
                                        control={control}
                                        categories={blogCategories}
                                        name="category"
                                        label="Danh mục bài viết"
                                        placeholder="Chọn danh mục"
                                        multiple={true}
                                    />
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
                                                        label="Thẻ bài viết"
                                                        placeholder="Chọn thẻ..."
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
                            <LoadingButton
                                type="submit"
                                loading={isUpdating || isUploading}
                                label="Cập nhật bài viết"
                                loadingLabel="Đang cập nhật..."
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    );
};




