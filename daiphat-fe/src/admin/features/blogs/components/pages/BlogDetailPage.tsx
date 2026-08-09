"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import Link from "@/admin/components/navigation/AdminLink";
import {
    Box,
    Card,
    Container,
    Stack,
    Grid,
    Typography,
    Chip,
    Button,
    Divider,
    alpha,
    Avatar,
    SpeedDial,
    SpeedDialAction,
    Tooltip,
} from "@mui/material";
import { Icon } from '@/admin/components/ui/AdminIcon';
import dayjs from "dayjs";
import "dayjs/locale/vi";
import { useBlogDetail, useBlogTypes, useDeleteBlog, useUpdateBlog } from "../../hooks/useBlog";
import { BLOG_STATUS, BlogStatus } from '../../types/blog.type';
import { prefixAdmin } from "../../../../constants/routes";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { SpinnerLoading } from "../../../../components/ui/SpinnerLoading";
import { AppToast as toast } from "../../../../../utils/toast.util";
import { useState } from "react";
import { FacebookIcon, InstagramIcon, ShareIcon } from "../../../../assets/icons";
import { confirmAction } from "../../../../utils/swal";
import { RightSidebarBlog } from "../../../../../client/features/blog";
import { usePermissions } from "../../../../hooks/usePermission";
import { PERMISSIONS } from "../../../../constants/permission.constants";

dayjs.locale("vi");

// ─── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    [BLOG_STATUS.PUBLISHED]: { label: "Đã xuất bản", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)", icon: "solar:check-circle-bold-duotone" },
    [BLOG_STATUS.DRAFT]: { label: "Bản nháp", color: "var(--palette-warning-dark)", bg: "var(--palette-warning-lighter)", icon: "solar:document-text-bold-duotone" },
    [BLOG_STATUS.UNPUBLISHED]: { label: "Đã gỡ xuống", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)", icon: "solar:archive-down-minimlistic-bold-duotone" },
    archived: { label: "Đã gỡ xuống", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)", icon: "solar:archive-down-minimlistic-bold-duotone" },
    [BLOG_STATUS.SCHEDULED]: { label: "Đã lên lịch", color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)", icon: "solar:calendar-bold-duotone" },
};

const getStatusConfig = (status: string) =>
    STATUS_CONFIG[status?.toLowerCase()] ?? STATUS_CONFIG[BLOG_STATUS.DRAFT];

// ─── InfoRow helper ──────────────────────────────────────────────────────────
const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ py: 1.25 }}>
        <Typography variant="body2" sx={{ color: "var(--palette-text-disabled)", flexShrink: 0, minWidth: 130 }}>
            {label}
        </Typography>
        <Box sx={{ textAlign: "right", flex: 1 }}>{children}</Box>
    </Stack>
);

// ─── Main component ──────────────────────────────────────────────────────────
export const BlogDetailPage = () => {
    const { id } = useRouteParams();
    const router = useAdminRouter();

    const { data: blog, isLoading, refetch } = useBlogDetail(id);
    const { data: blogTypes = [] } = useBlogTypes();
    const { mutate: updateBlog, isPending: isUpdating } = useUpdateBlog();
    const { mutate: deleteBlog, isPending: isDeleting } = useDeleteBlog();
    const { can } = usePermissions();
    const canEdit = can(PERMISSIONS.ARTICLE.EDIT);
    const canDeleteArticle = can(PERMISSIONS.ARTICLE.DELETE);

    const [confirmDelete, setConfirmDelete] = useState(false);

    const status: BlogStatus = (blog?.status || BLOG_STATUS.DRAFT).toLowerCase() as BlogStatus;
    const statusCfg = getStatusConfig(status);
    const isPublished = status === BLOG_STATUS.PUBLISHED;
    const isDraft = status === BLOG_STATUS.DRAFT;
    const isScheduled = status === BLOG_STATUS.SCHEDULED;
    const isUnpublished = status === BLOG_STATUS.UNPUBLISHED;
    const canDelete = canDeleteArticle && (isDraft || isUnpublished);
    const normalizedBlogType = typeof blog?.type === "string" ? blog.type.toLowerCase() : "";
    const blogTypeLabel = blogTypes.find((type) => {
        const value = typeof type.value === "string" ? type.value.toLowerCase() : "";
        const code = typeof type.code === "string" ? type.code.toLowerCase() : "";
        return value === normalizedBlogType || code === normalizedBlogType;
    })?.label || blog?.type;

    // ── Handlers ────────────────────────────────────────────────────────────
    const handlePublish = () => {
        updateBlog(
            { id: id!, data: { status: BLOG_STATUS.PUBLISHED, scheduledAt: null } },
            {
                onSuccess: (res) => {
                    if (res.success) { toast.success("Đăng bài thành công"); refetch(); }
                    else toast.error(res.message || "Không thể đăng bài");
                },
                onError: () => toast.error("Có lỗi xảy ra"),
            }
        );
    };

    const handleMoveToDraft = () => {
        updateBlog(
            { id: id!, data: { status: BLOG_STATUS.DRAFT, scheduledAt: null } },
            {
                onSuccess: (res) => {
                    if (res.success) { toast.success("Đã hủy lịch đăng"); refetch(); }
                    else toast.error(res.message || "Không thể hủy lịch");
                },
                onError: () => toast.error("Có lỗi xảy ra"),
            }
        );
    };

    const handleUnpublish = () => {
        confirmAction(
            "Xác nhận gỡ bài?",
            "Hành động này sẽ ẩn bài viết khỏi trang Khách hàng. Xác nhận gỡ?",
            () => {
                updateBlog(
                    { id: id!, data: { status: BLOG_STATUS.UNPUBLISHED, scheduledAt: null } },
                    {
                        onSuccess: (res) => {
                            if (res.success) { toast.success("Đã gỡ bài xuống"); refetch(); }
                            else toast.error(res.message || "Không thể gỡ bài");
                        },
                        onError: () => toast.error("Có lỗi xảy ra"),
                    }
                );
            },
            "warning"
        );
    };

    const handleDelete = () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
            return;
        }
        deleteBlog(id!, {
            onSuccess: (res: any) => {
                if (res.success !== false) { toast.success("Đã xóa bài viết"); router.push(`/${prefixAdmin}/blog/list`); }
                else toast.error(res.message || "Xóa thất bại");
            },
            onError: () => toast.error("Có lỗi khi xóa bài viết"),
        });
    };

    const goToScheduleEditor = () => {
        router.push(`/${prefixAdmin}/blog/edit/${id}`);
    };

    // ── Loading / empty states ───────────────────────────────────────────────
    if (!isLoading && !blog) {
        return (
            <Box sx={{ p: 6, textAlign: "center" }}>
                <Icon icon="solar:document-broken-bold-duotone" width={64} color="var(--palette-text-disabled)" />
                <Typography sx={{ mt: 2, color: "var(--palette-text-disabled)" }}>Không tìm thấy bài viết</Typography>
                <Button variant="contained" className="btn-primary-admin" onClick={() => router.push(`/${prefixAdmin}/blog/list`)} sx={{ mt: 3 }}>
                    Quay lại danh sách
                </Button>
            </Box>
        );
    }

    const thumbnail = blog?.avatar || blog?.thumbnail || (blog as any)?.featuredImage;

    // ──────────────────────────────────────────────────────────────────────────
    // Shared Header (always visible, both modes)
    // ──────────────────────────────────────────────────────────────────────────
    const header = (
        <PageHeader
            title="Chi tiết bài viết"
            breadcrumbItems={[
                { label: "Dashboard", to: "/" },
                { label: "Bài viết", to: `/${prefixAdmin}/blog/list` },
                { label: blog?.name || blog?.title || "Chi tiết" },
            ]}
            action={
            blog ? (
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" flexWrap="wrap">
                <Button
                    variant="outlined"
                    startIcon={<Icon icon="solar:eye-bold-duotone" width={16} />}
                    onClick={() => window.open(`/blogs/detail/${blog.slug}?previewId=${id}`, '_blank')}
                    sx={{
                        height: 36, fontWeight: 600, fontSize: "0.875rem", textTransform: "none",
                        borderRadius: "8px", borderColor: (t) => alpha(t.palette.grey[500], 0.4),
                        color: "var(--palette-text-secondary)",
                        "&:hover": { borderColor: "var(--palette-text-primary)", bgcolor: (t) => alpha(t.palette.grey[500], 0.08) },
                    }}
                >
                    Xem trước
                </Button>

                {canEdit && (
                    <Button
                        variant="outlined"
                        startIcon={<Icon icon="solar:pen-bold" width={16} />}
                        onClick={() => router.push(`/${prefixAdmin}/blog/edit/${id}`)}
                        sx={{
                            height: 36, fontWeight: 600, fontSize: "0.875rem", textTransform: "none",
                            borderRadius: "8px", borderColor: (t) => alpha(t.palette.grey[500], 0.4),
                            color: "var(--palette-text-primary)",
                            "&:hover": { borderColor: "var(--palette-text-primary)", bgcolor: (t) => alpha(t.palette.grey[500], 0.08) },
                        }}
                    >
                        Chỉnh sửa
                    </Button>
                )}

                {canEdit && (isDraft || isUnpublished) && (
                    <Button
                        variant="outlined"
                        startIcon={<Icon icon="solar:calendar-bold-duotone" width={16} />}
                        onClick={goToScheduleEditor}
                        sx={{
                            height: 36, fontWeight: 600, fontSize: "0.875rem", textTransform: "none",
                            borderRadius: "8px", borderColor: (t) => alpha(t.palette.grey[500], 0.4),
                            color: "var(--palette-text-primary)",
                            "&:hover": { borderColor: "var(--palette-text-primary)", bgcolor: (t) => alpha(t.palette.grey[500], 0.08) },
                        }}
                    >
                        Lên lịch
                    </Button>
                )}

                {canEdit && (isDraft || isUnpublished) && (
                    <Button
                        variant="contained"
                        startIcon={<Icon icon="solar:play-circle-bold" width={16} />}
                        onClick={handlePublish}
                        disabled={isUpdating}
                        sx={{
                            height: 36, fontWeight: 700, fontSize: "0.875rem", textTransform: "none",
                            borderRadius: "8px", bgcolor: "var(--palette-text-primary)",
                            color: "var(--palette-common-white)",
                            boxShadow: "none",
                            "&:hover": { bgcolor: "var(--palette-grey-700)", boxShadow: "none" },
                        }}
                    >
                        {isUnpublished ? "Đăng lại" : "Đăng bài"}
                    </Button>
                )}

                {canEdit && isScheduled && (
                    <>
                        <Button
                            variant="contained"
                            startIcon={<Icon icon="solar:play-circle-bold" width={16} />}
                            onClick={handlePublish}
                            disabled={isUpdating}
                            sx={{
                                height: 36, fontWeight: 700, fontSize: "0.875rem", textTransform: "none",
                                borderRadius: "8px", bgcolor: "var(--palette-text-primary)",
                                color: "var(--palette-common-white)",
                                boxShadow: "none",
                                "&:hover": { bgcolor: "var(--palette-grey-700)", boxShadow: "none" },
                            }}
                        >
                            Đăng ngay
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<Icon icon="solar:calendar-remove-bold-duotone" width={16} />}
                            onClick={handleMoveToDraft}
                            disabled={isUpdating}
                            sx={{
                                height: 36, fontWeight: 600, fontSize: "0.875rem", textTransform: "none",
                                borderRadius: "8px", borderColor: (t) => alpha(t.palette.grey[500], 0.4),
                                color: "var(--palette-text-primary)",
                                "&:hover": { borderColor: "var(--palette-text-primary)", bgcolor: (t) => alpha(t.palette.grey[500], 0.08) },
                            }}
                        >
                            Hủy lịch
                        </Button>
                    </>
                )}

                {canEdit && isPublished && (
                    <Button
                        variant="outlined"
                        startIcon={<Icon icon="solar:archive-down-minimlistic-bold-duotone" width={16} />}
                        onClick={handleUnpublish}
                        disabled={isUpdating}
                        sx={{
                            height: 36, fontWeight: 600, fontSize: "0.875rem", textTransform: "none",
                            borderRadius: "8px", borderColor: (t) => alpha(t.palette.grey[500], 0.4),
                            color: "var(--palette-text-primary)",
                            "&:hover": { borderColor: "var(--palette-text-primary)", bgcolor: (t) => alpha(t.palette.grey[500], 0.08) },
                        }}
                    >
                        Gỡ bài xuống
                    </Button>
                )}

                {canDelete && (
                    <Button
                        variant="outlined"
                        startIcon={<Icon icon="solar:trash-bin-trash-bold" width={16} />}
                        onClick={handleDelete}
                        disabled={isDeleting}
                        sx={{
                            height: 36, fontWeight: 600, fontSize: "0.875rem", textTransform: "none",
                            borderRadius: "8px",
                            borderColor: confirmDelete ? "var(--palette-error-main)" : (t) => alpha(t.palette.error.main, 0.36),
                            color: "var(--palette-error-main)",
                            bgcolor: confirmDelete ? (t) => alpha(t.palette.error.main, 0.08) : "transparent",
                            "&:hover": { borderColor: "var(--palette-error-main)", bgcolor: (t) => alpha(t.palette.error.main, 0.08) },
                        }}
                    >
                        {confirmDelete ? "Xác nhận xóa?" : "Xóa"}
                    </Button>
                )}
            </Stack>
            ) : undefined
            }
        />
    );

    // ── Render ───────────────────────────────────────────────────────────────
    const infoView = blog ? (
        <Grid container spacing={3}>
            {/* Left */}
            <Grid size={{ xs: 12, md: 8 }}>
                <Stack spacing={3}>
                    {/* Thumbnail + title card */}
                    <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)", overflow: "hidden", position: "relative" }}>
                        {thumbnail ? (
                            <Box
                                sx={{
                                    width: "100%",
                                    height: 320,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    bgcolor: "#fff",
                                }}
                            >
                                <Box component="img" src={thumbnail} alt={blog.name || blog.title}
                                    sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block", bgcolor: "#fff" }}
                                    onError={(e: any) => { e.currentTarget.style.display = "none"; }}
                                />
                            </Box>
                        ) : (
                            <Box sx={{ width: "100%", height: 200, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "var(--palette-background-neutral)" }}>
                                <Icon icon="solar:gallery-broken" width={64} color="var(--palette-text-disabled)" />
                            </Box>
                        )}

                        <Box sx={{ p: 3 }}>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: "var(--palette-text-primary)", lineHeight: 1.4, mb: 1 }}>
                                {blog.name || blog.title}
                            </Typography>
                            {blog.description && (
                                <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)", fontStyle: "italic", lineHeight: 1.6 }}>
                                    {blog.description}
                                </Typography>
                            )}
                        </Box>
                    </Card>

                    {/* Content preview */}
                    {blog.content && (
                        <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)", p: 3 }}>
                            <Typography sx={{ fontSize: "1.0625rem", fontWeight: 700, mb: 2, color: "var(--palette-text-primary)" }}>
                                Nội dung bài viết
                            </Typography>
                            <Divider sx={{ mb: 3, borderStyle: "dashed" }} />
                            <Box sx={{
                                color: "var(--palette-text-primary)",
                                "& img": { borderRadius: "var(--shape-borderRadius-md)", my: 2, maxWidth: "100%" },
                                "& p": { mb: 1.5, fontSize: "0.9375rem", lineHeight: 1.8 },
                                "& h2": { fontSize: "1.375rem", fontWeight: 700, mt: 3, mb: 1.5 },
                                "& h3": { fontSize: "1.125rem", fontWeight: 700, mt: 2.5, mb: 1 },
                                "& ul, & ol": { pl: 3, mb: 1.5 },
                                "& li": { mb: 0.75, fontSize: "0.9375rem" },
                                "& blockquote": { borderLeft: "4px solid var(--palette-primary-main)", pl: 2, color: "var(--palette-text-secondary)", fontStyle: "italic", my: 2 },
                            }}>
                                <div dangerouslySetInnerHTML={{ __html: blog.content }} />
                            </Box>
                        </Card>
                    )}
                </Stack>
            </Grid>

            {/* Right sidebar */}
            <Grid size={{ xs: 12, md: 4 }}>
                <Stack spacing={3}>
                    {/* Basic info card */}
                    <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                        <Typography sx={{ px: 3, pt: 3, pb: 2, fontSize: "1.0625rem", fontWeight: 700, color: "var(--palette-text-primary)" }}>
                            Thông tin bài viết
                        </Typography>
                        <Divider sx={{ borderStyle: "dashed" }} />
                        <Box sx={{ px: 3, py: 1 }}>
                            <InfoRow label="Trạng thái">
                                <Chip
                                    icon={<Icon icon={statusCfg.icon} width={13} />}
                                    label={statusCfg.label} size="small"
                                    sx={{ fontWeight: 700, fontSize: "0.75rem", height: 24, borderRadius: "6px", color: statusCfg.color, bgcolor: statusCfg.bg, "& .MuiChip-icon": { color: statusCfg.color } }}
                                />
                            </InfoRow>
                            <Divider sx={{ borderStyle: "dashed" }} />

                            <InfoRow label="Danh mục">
                                {blog.categoryRaw?.name ? (
                                    <Chip label={blog.categoryRaw.name} size="small"
                                        sx={{ fontWeight: 600, fontSize: "0.75rem", height: 24, borderRadius: "6px", color: "var(--palette-info-dark)", bgcolor: "var(--palette-info-lighter)" }} />
                                ) : (
                                    <Typography variant="body2" sx={{ color: "var(--palette-text-disabled)" }}>Chưa có danh mục</Typography>
                                )}
                            </InfoRow>
                            <Divider sx={{ borderStyle: "dashed" }} />

                            {blog.type && (
                                <>
                                    <InfoRow label="Loại bài viết">
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--palette-text-primary)" }}>{blogTypeLabel}</Typography>
                                    </InfoRow>
                                    <Divider sx={{ borderStyle: "dashed" }} />
                                </>
                            )}

                            {blog.slug && (
                                <>
                                    <InfoRow label="Slug">
                                        <Typography variant="caption" sx={{ color: "var(--palette-primary-dark)", bgcolor: "var(--palette-primary-lighter)", px: 1, py: 0.25, borderRadius: "4px", fontFamily: "monospace", wordBreak: "break-all" }}>
                                            {blog.slug}
                                        </Typography>
                                    </InfoRow>
                                    <Divider sx={{ borderStyle: "dashed" }} />
                                </>
                            )}

                            <InfoRow label="Lượt xem">
                                <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--palette-text-primary)" }}>
                                    {(blog.viewCount ?? 0).toLocaleString("vi-VN")}
                                </Typography>
                            </InfoRow>

                            {blog.scheduledAt && (
                                <>
                                    <Divider sx={{ borderStyle: "dashed" }} />
                                    <InfoRow label="Lên lịch đăng">
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--palette-info-dark)" }}>
                                            {dayjs(blog.scheduledAt).format("DD/MM/YYYY HH:mm")}
                                        </Typography>
                                    </InfoRow>
                                </>
                            )}

                            {blog.publishedAt && status !== BLOG_STATUS.SCHEDULED && (
                                <>
                                    <Divider sx={{ borderStyle: "dashed" }} />
                                    <InfoRow label="Ngày xuất bản">
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--palette-success-dark)" }}>
                                            {dayjs(blog.publishedAt).format("DD/MM/YYYY HH:mm")}
                                        </Typography>
                                    </InfoRow>
                                </>
                            )}
                        </Box>
                    </Card>

                    {/* Timeline */}
                    <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                        <Typography sx={{ px: 3, pt: 3, pb: 2, fontSize: "1.0625rem", fontWeight: 700, color: "var(--palette-text-primary)" }}>Lịch sử</Typography>
                        <Divider sx={{ borderStyle: "dashed" }} />
                        <Stack spacing={0} sx={{ px: 3, py: 1 }}>
                            <InfoRow label="Ngày tạo">
                                <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--palette-text-primary)" }}>
                                    {blog.createdAt ? dayjs(blog.createdAt).format("DD/MM/YYYY HH:mm") : "—"}
                                </Typography>
                            </InfoRow>
                            <Divider sx={{ borderStyle: "dashed" }} />
                            <InfoRow label="Cập nhật lần cuối">
                                <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--palette-text-primary)" }}>
                                    {blog.updatedAt ? dayjs(blog.updatedAt).format("DD/MM/YYYY HH:mm") : "—"}
                                </Typography>
                            </InfoRow>
                        </Stack>
                    </Card>

                    {/* Author */}
                    <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)", p: 3 }}>
                        <Typography sx={{ fontSize: "1.0625rem", fontWeight: 700, mb: 2, color: "var(--palette-text-primary)" }}>Tác giả</Typography>
                        {blog.createdBy ? (
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar sx={{ width: 40, height: 40, bgcolor: "var(--palette-primary-main)", fontSize: "1rem", fontWeight: 700 }}>
                                    {String(blog.createdBy)[0]?.toUpperCase()}
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--palette-text-primary)" }}>{blog.createdBy}</Typography>
                                    {blog.lastModifiedBy && blog.lastModifiedBy !== blog.createdBy && (
                                        <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)", display: "block" }}>Sửa bởi: {blog.lastModifiedBy}</Typography>
                                    )}
                                </Box>
                            </Stack>
                        ) : (
                            <Typography variant="body2" sx={{ color: "var(--palette-text-disabled)" }}>Chưa có thông tin tác giả</Typography>
                        )}
                    </Card>

                    {/* Tags */}
                    {Array.isArray(blog.tagsRaw) && blog.tagsRaw.length > 0 && (
                        <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)", p: 3 }}>
                            <Typography sx={{ fontSize: "1.0625rem", fontWeight: 700, mb: 2, color: "var(--palette-text-primary)" }}>Thẻ bài viết</Typography>
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                                {blog.tagsRaw.map((tag: any) => (
                                    <Chip key={tag.id ?? tag} label={tag.name ?? tag} size="small"
                                        sx={{ fontWeight: 600, fontSize: "0.75rem", height: 24, borderRadius: "6px", bgcolor: "var(--palette-background-neutral)", color: "var(--palette-text-secondary)" }} />
                                ))}
                            </Box>
                        </Card>
                    )}
                </Stack>
            </Grid>
        </Grid>
    ) : null;

    return (
        <>
            {header}
            {isLoading ? (
                <SpinnerLoading />
            ) : blog ? (
                infoView
            ) : null}
        </>
    );
};
