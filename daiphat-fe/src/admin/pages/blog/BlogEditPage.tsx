import { Box, Stack, TextField, ThemeProvider, useTheme, CircularProgress, FormControl, InputLabel, Select, MenuItem, FormHelperText, Autocomplete, createTheme } from "@mui/material";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { Tiptap } from "../../components/layouts/titap/Tiptap";
import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { useBlogDetail, useUpdateBlog, useBlogTags, useBlogStatuses, useBlogTypes } from "./hooks/useBlog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { createBlogSchema, CreateBlogFormValues } from "../../schemas/blog.schema";
import { prefixAdmin } from "../../constants/routes";
import { FormUploadSingleFile } from "../../components/upload/FormUploadSingleFile";
import { uploadBlogImage } from "../../api/blog.api";
import { toast } from "react-toastify";
import { useParams } from "react-router-dom";
import { useNestedBlogCategories } from "../blog-category/hooks/useBlogCategory";
import { CategoryTreeSelectGeneric } from "../../components/ui/CategoryTreeSelectGeneric";
import { confirmAction } from "../../utils/swal";

export const BlogEditPage = () => {
    const { id } = useParams();
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
                    listbox: { padding: 0 },
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

    const { data: detailRes, isLoading: isLoadingDetail } = useBlogDetail(id);
    const { data: blogCategories = [] } = useNestedBlogCategories();
    const { data: blogTags = [], isLoading: isLoadingTags } = useBlogTags();
    const { data: blogStatuses = [] } = useBlogStatuses();
    const { data: blogTypes = [] } = useBlogTypes();
    const { mutate: update, isPending: isUpdating } = useUpdateBlog();
    const [isUploading, setIsUploading] = useState(false);
    const currentStatus = (detailRes?.status || "draft").toLowerCase();

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

    useEffect(() => {
        if (detailRes) {
            reset({
                name:        detailRes.name        || "",
                slug:        detailRes.slug        || "",
                description: detailRes.description || "",
                content:     detailRes.content     || "",
                avatar:      detailRes.avatar      || "",
                category:    detailRes.category    || [],
                status:      detailRes.status      || "draft",
                type:        detailRes.type        || "blog",
                tags:        detailRes.tags        || [],
                scheduledAt: detailRes.scheduledAt || null,
            });
        }
    }, [detailRes, reset]);

    const submitForm = async (data: CreateBlogFormValues, targetStatus?: string) => {
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

            let categoryArray = data.category;
            if (typeof categoryArray === 'string') {
                try { categoryArray = JSON.parse(categoryArray); } catch { categoryArray = []; }
            }
            const categoryId = Array.isArray(categoryArray) && categoryArray.length > 0
                ? Number(categoryArray[0])
                : null;

            const nextStatus = targetStatus ?? currentStatus;
            const normalizedScheduledAt = data.scheduledAt || detailRes?.scheduledAt || null;

            if (nextStatus === "scheduled" && !normalizedScheduledAt) {
                toast.error("Vui lòng chọn thời gian đăng bài trước khi lên lịch.");
                return;
            }

            const payload = {
                title:       data.name,
                summary:     data.description,
                content:     data.content,
                thumbnail:   imageUrl,
                categoryId,
                status:      nextStatus,
                type:        data.type,
                slug:        data.slug || detailRes?.slug || "",
                tagIds:      data.tags || [],
                scheduledAt: nextStatus === "scheduled" ? normalizedScheduledAt : null,
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

    const handleSubmitWithStatus = (targetStatus?: string, confirmBeforeSubmit?: boolean) =>
        handleSubmit((data) => {
            const runSubmit = () => submitForm(data, targetStatus);
            if (confirmBeforeSubmit) {
                confirmAction(
                    "Xác nhận gỡ bài?",
                    "Hành động này sẽ ẩn bài viết khỏi trang Khách hàng. Xác nhận gỡ?",
                    runSubmit,
                    "warning"
                );
                return;
            }
            return runSubmit();
        });

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
                <form>
                    <Stack sx={{ margin: "0px calc(15 * var(--spacing))", gap: "calc(5 * var(--spacing))" }}>
                        {/* ─── Details card ──────────────────────────────────── */}
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
                                            sx={{ '& .MuiOutlinedInput-input': { padding: 0 } }}
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

                        {/* ─── Attributes card ───────────────────────────────── */}
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
                                    {/* Status */}
                                    <Controller
                                        name="status"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControl fullWidth>
                                                <InputLabel id="status-select-label">Trạng thái</InputLabel>
                                                <Select
                                                    {...field}
                                                    disabled
                                                    labelId="status-select-label"
                                                    label="Trạng thái"
                                                >
                                                    {blogStatuses.map((opt) => (
                                                        <MenuItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        )}
                                    />

                                    {/* Type */}
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

                                    {/* Category */}
                                    <CategoryTreeSelectGeneric
                                        control={control}
                                        categories={blogCategories}
                                        name="category"
                                        label="Danh mục bài viết"
                                        placeholder="Chọn danh mục"
                                        multiple={true}
                                    />

                                    {/* Scheduled At */}
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

                                    {/* Tags (span 2 cols) */}
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
                            {currentStatus === "draft" && (
                                <>
                                    <LoadingButton
                                        type="button"
                                        onClick={handleSubmitWithStatus("draft")}
                                        loading={isUpdating || isUploading}
                                        label="Lưu nháp"
                                        loadingLabel="Đang lưu..."
                                    />
                                    <LoadingButton
                                        type="button"
                                        onClick={handleSubmitWithStatus("published")}
                                        loading={isUpdating || isUploading}
                                        label="Đăng bài"
                                        loadingLabel="Đang đăng..."
                                    />
                                    <LoadingButton
                                        type="button"
                                        onClick={handleSubmitWithStatus("scheduled")}
                                        loading={isUpdating || isUploading}
                                        label="Lên lịch"
                                        loadingLabel="Đang lưu lịch..."
                                    />
                                </>
                            )}

                            {currentStatus === "scheduled" && (
                                <>
                                    <LoadingButton
                                        type="button"
                                        onClick={handleSubmitWithStatus("scheduled")}
                                        loading={isUpdating || isUploading}
                                        label="Lưu lịch"
                                        loadingLabel="Đang lưu lịch..."
                                    />
                                    <LoadingButton
                                        type="button"
                                        onClick={handleSubmitWithStatus("published")}
                                        loading={isUpdating || isUploading}
                                        label="Đăng ngay"
                                        loadingLabel="Đang đăng..."
                                    />
                                    <LoadingButton
                                        type="button"
                                        onClick={handleSubmitWithStatus("draft")}
                                        loading={isUpdating || isUploading}
                                        label="Hủy lịch"
                                        loadingLabel="Đang hủy lịch..."
                                    />
                                </>
                            )}

                            {currentStatus === "published" && (
                                <>
                                    <LoadingButton
                                        type="button"
                                        onClick={handleSubmitWithStatus("published")}
                                        loading={isUpdating || isUploading}
                                        label="Cập nhật"
                                        loadingLabel="Đang cập nhật..."
                                    />
                                    <LoadingButton
                                        type="button"
                                        onClick={handleSubmitWithStatus("unpublished", true)}
                                        loading={isUpdating || isUploading}
                                        label="Gỡ bài"
                                        loadingLabel="Đang gỡ..."
                                    />
                                </>
                            )}

                            {currentStatus === "unpublished" && (
                                <>
                                    <LoadingButton
                                        type="button"
                                        onClick={handleSubmitWithStatus("unpublished")}
                                        loading={isUpdating || isUploading}
                                        label="Lưu"
                                        loadingLabel="Đang lưu..."
                                    />
                                    <LoadingButton
                                        type="button"
                                        onClick={handleSubmitWithStatus("published")}
                                        loading={isUpdating || isUploading}
                                        label="Đăng lại"
                                        loadingLabel="Đang đăng..."
                                    />
                                    <LoadingButton
                                        type="button"
                                        onClick={handleSubmitWithStatus("scheduled")}
                                        loading={isUpdating || isUploading}
                                        label="Lên lịch"
                                        loadingLabel="Đang lưu lịch..."
                                    />
                                </>
                            )}

                            {!["draft", "scheduled", "published", "unpublished"].includes(currentStatus) && (
                                <LoadingButton
                                    type="button"
                                    onClick={handleSubmitWithStatus(currentStatus)}
                                    loading={isUpdating || isUploading}
                                    label="Cập nhật"
                                    loadingLabel="Đang cập nhật..."
                                />
                            )}
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    );
};
