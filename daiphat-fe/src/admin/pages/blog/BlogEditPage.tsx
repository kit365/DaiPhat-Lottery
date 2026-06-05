import { Box, Stack, TextField, ThemeProvider, useTheme, CircularProgress, FormControl, InputLabel, Select, MenuItem, FormHelperText, Autocomplete, createTheme } from "@mui/material";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { Tiptap } from "../../components/layouts/titap/Tiptap";
import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { useBlogDetail, useUpdateBlog, useBlogTags, useBlogStatuses, useBlogTypes } from "./hooks/useBlog";
import { BLOG_STATUS } from "../../../types/blogs.type";
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

const getMinScheduleValue = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
};

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
    const currentStatus = (detailRes?.status || BLOG_STATUS.DRAFT).toLowerCase();

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
            status: BLOG_STATUS.DRAFT,
            type: "blog",
            tags: [],
            scheduledAt: null,
        },
    });
    const selectedStatus = watch("status");

    useEffect(() => {
        if (detailRes) {
            reset({
                name:        detailRes.name        || "",
                description: detailRes.description || "",
                content:     detailRes.content     || "",
                avatar:      detailRes.avatar      || "",
                category:    detailRes.category    || [],
                status:      detailRes.status      || BLOG_STATUS.DRAFT,
                type:        detailRes.type        || "blog",
                tags:        detailRes.tags        || [],
                scheduledAt: detailRes.scheduledAt || null,
            });
        }
    }, [detailRes, reset]);

    const allowedStatuses = blogStatuses.filter((status) => {
        const val = status.value;
        if (currentStatus === BLOG_STATUS.DRAFT) {
            return [BLOG_STATUS.DRAFT, BLOG_STATUS.PUBLISHED, BLOG_STATUS.SCHEDULED].includes(val as any);
        }
        if (currentStatus === BLOG_STATUS.SCHEDULED) {
            return [BLOG_STATUS.SCHEDULED, BLOG_STATUS.PUBLISHED, BLOG_STATUS.DRAFT].includes(val as any);
        }
        if (currentStatus === BLOG_STATUS.PUBLISHED) {
            return [BLOG_STATUS.PUBLISHED, BLOG_STATUS.UNPUBLISHED].includes(val as any);
        }
        if (currentStatus === BLOG_STATUS.UNPUBLISHED) {
            return [BLOG_STATUS.UNPUBLISHED, BLOG_STATUS.PUBLISHED, BLOG_STATUS.SCHEDULED].includes(val as any);
        }
        return val === currentStatus;
    });

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

            if (nextStatus === BLOG_STATUS.SCHEDULED && !normalizedScheduledAt) {
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
                tagIds:      data.tags || [],
                scheduledAt: nextStatus === BLOG_STATUS.SCHEDULED ? normalizedScheduledAt : null,
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

    // Dynamic Button properties based on selectedStatus
    let buttonLabel = "Cập nhật";
    let loadingLabel = "Đang cập nhật...";
    let targetStatus: string = selectedStatus;
    let confirmBeforeSubmit = false;

    if (selectedStatus === BLOG_STATUS.DRAFT) {
        if (currentStatus === BLOG_STATUS.SCHEDULED) {
            buttonLabel = "Hủy lịch";
            loadingLabel = "Đang hủy lịch...";
        } else {
            buttonLabel = "Lưu nháp";
            loadingLabel = "Đang lưu...";
        }
    } else if (selectedStatus === BLOG_STATUS.PUBLISHED) {
        if (currentStatus === BLOG_STATUS.DRAFT) {
            buttonLabel = "Đăng bài";
            loadingLabel = "Đang đăng...";
        } else if (currentStatus === BLOG_STATUS.SCHEDULED) {
            buttonLabel = "Đăng ngay";
            loadingLabel = "Đang đăng...";
        } else if (currentStatus === BLOG_STATUS.UNPUBLISHED) {
            buttonLabel = "Đăng lại";
            loadingLabel = "Đang đăng...";
        } else {
            buttonLabel = "Cập nhật";
            loadingLabel = "Đang cập nhật...";
        }
    } else if (selectedStatus === BLOG_STATUS.SCHEDULED) {
        if (currentStatus === BLOG_STATUS.SCHEDULED) {
            buttonLabel = "Lưu lịch";
            loadingLabel = "Đang lưu lịch...";
        } else {
            buttonLabel = "Lên lịch";
            loadingLabel = "Đang lưu lịch...";
        }
    } else if (selectedStatus === BLOG_STATUS.UNPUBLISHED) {
        if (currentStatus === BLOG_STATUS.PUBLISHED) {
            buttonLabel = "Gỡ bài";
            loadingLabel = "Đang gỡ...";
            confirmBeforeSubmit = true;
        } else {
            buttonLabel = "Lưu";
            loadingLabel = "Đang lưu...";
        }
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
                                                    labelId="status-select-label"
                                                    label="Trạng thái"
                                                >
                                                    {allowedStatuses.map((opt) => (
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

                                    {/* Scheduled At */}
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
                            <LoadingButton
                                type="button"
                                onClick={handleSubmitWithStatus(targetStatus, confirmBeforeSubmit)}
                                loading={isUpdating || isUploading}
                                label={buttonLabel}
                                loadingLabel={loadingLabel}
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    );
};
