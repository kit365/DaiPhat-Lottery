import { Box, Stack, TextField, ThemeProvider, useTheme, MenuItem, Select, FormControl, InputLabel, FormHelperText, createTheme, Autocomplete, CircularProgress } from "@mui/material"
import { LoadingButton } from "../../components/ui/LoadingButton";
import { useTranslation } from "react-i18next";
import { Breadcrumb } from "../../components/ui/Breadcrumb"
import { Title } from "../../components/ui/Title"
import { useState, type Dispatch, type SetStateAction } from "react"
import { Tiptap } from "../../components/layouts/titap/Tiptap"
import { CollapsibleCard } from "../../components/ui/CollapsibleCard"
import { useCreateBlog, useBlogTags, useBlogTypes, useBlogStatuses } from "./hooks/useBlog"
import { uploadBlogImage } from "../../api/blog.api"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { createBlogSchema, CreateBlogFormValues } from "../../schemas/blog.schema"
import { FormUploadSingleFile } from "../../components/upload/FormUploadSingleFile"
import { toast } from "react-toastify"
import { prefixAdmin } from "../../constants/routes"

import { useNestedBlogCategories } from "../blog-category/hooks/useBlogCategory";
import { CategoryTreeSelectGeneric } from "../../components/ui/CategoryTreeSelectGeneric";

export const BlogCreatePage = () => {
    const { t } = useTranslation();
    const [expandedDetail, setExpandedDetail] = useState(true);
    const [expandedExtra, setExpandedExtra] = useState(true);
    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);

    const outerTheme = useTheme();

    const localTheme = createTheme(outerTheme, {
        components: {
            MuiCard: {
                styleOverrides: {
                    root: {
                        backgroundImage: "none !important",
                        backdropFilter: "none !important",
                        backgroundColor: "var(--palette-background-paper) !important",
                        boxShadow: "var(--customShadows-card)",
                        borderRadius: "var(--shape-borderRadius-lg)",
                        color: "var(--palette-text-primary)",
                    },
                }
            },
            MuiAutocomplete: {
                styleOverrides: {
                    listbox: {
                        padding: 0,
                    },
                    option: {
                        fontSize: '0.875rem',
                        padding: '6px',
                        marginBottom: '4px',
                        borderRadius: "var(--shape-borderRadius-sm)",
                    },
                },
            },
        }
    });

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
    } = useForm<CreateBlogFormValues>({
        resolver: zodResolver(createBlogSchema) as any,
        defaultValues: {
            name: "",
            slug: "",
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
                category: JSON.stringify(data.category)
            };

            create(payload, {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success(response.message || "Tạo bài viết thành công");
                        reset();
                    } else {
                        toast.error(response.message);
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
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title={t("admin.blog.title.create")} />
                    <Breadcrumb
                        items={[
                            { label: t("admin.dashboard.title"), to: "/" },
                            { label: t("admin.blog.title.list"), to: `/${prefixAdmin}/blog/list` },
                            { label: t("admin.common.create") }
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
                            title={t("admin.common.details")}
                            subheader={t("admin.common.description")}
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
                                            label={t("admin.blog.fields.title")}
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
                                            label={t("admin.blog.fields.excerpt")}
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
                            title={t("admin.common.attributes")}
                            subheader={t("admin.common.description")}
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
                                                <InputLabel id="status-select-label">{t("admin.common.status")}</InputLabel>
                                                <Select
                                                    {...field}
                                                    labelId="status-select-label"
                                                    label={t("admin.common.status")}
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
                                    <CategoryTreeSelectGeneric
                                        control={control}
                                        categories={blogCategories}
                                        name="category"
                                        label={t("admin.blog.fields.category")}
                                        placeholder={t("admin.blog.fields.select_category")}
                                        multiple={true}
                                    />
                                    <Controller
                                        name="scheduledAt"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                value={field.value ?? ""}
                                                label="Lên lịch đăng"
                                                type="datetime-local"
                                                fullWidth
                                                InputLabelProps={{ shrink: true }}
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message || "Để trống nếu không lên lịch"}
                                            />
                                        )}
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
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label={t("admin.blog.fields.tags")}
                                                        placeholder={t("admin.blog.fields.tags_placeholder")}
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
                                loading={isPending || isUploading}
                                label={t('admin.blog.title.create')}
                                loadingLabel={t('admin.common.processing')}
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>

        </>
    )
}



