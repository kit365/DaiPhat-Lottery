"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import Link from "@/admin/components/navigation/AdminLink";
import { PERMISSIONS } from "../../../../constants/permission.constants";

import { Box, Card, Pagination, Stack, CircularProgress, Avatar, SvgIcon, ListItemText } from "@mui/material";
import type { GridColDef } from '@mui/x-data-grid';
import { LazyDataGrid } from '@/admin/shared/data-grid/LazyDataGrid';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon, EyeIcon } from "../../../../assets/icons";
import { prefixAdmin } from "../../../../constants/routes";
import { DATA_GRID_LOCALE_VN } from "@/admin/components/data-grid/localeText.config";
import { dataGridStyles } from "../../../../shared/data-grid";
import { AdminRowActionsMenu, type AdminRowActionsMenuItem } from "../../../../components/ui/AdminRowActionsMenu";

import dayjs from "dayjs";
import 'dayjs/locale/vi';

import { AppToast as toast } from "../../../../../utils/toast.util";
import { confirmAction, confirmDelete } from "../../../../utils/swal";
import { useDeleteBlog, useUpdateBlog } from "../../hooks/useBlog";
import { BLOG_STATUS } from '../../types/blog.type';
import { usePermissions } from "../../../../hooks/usePermission";

interface BlogListProps {
    blogs: any[];
    isLoading?: boolean;
    page: number;
    onPageChange: (page: number) => void;
    pagination: any;
    viewMode?: 'grid' | 'list';
}

export const BlogList = ({ blogs = [], isLoading = false, page, onPageChange, pagination, viewMode = 'grid' }: BlogListProps) => {
    const { can, canAny } = usePermissions();
    const canEdit = can(PERMISSIONS.ARTICLE.EDIT);
    const canDelete = can(PERMISSIONS.ARTICLE.DELETE);
    const showRowActions = canAny([PERMISSIONS.ARTICLE.EDIT, PERMISSIONS.ARTICLE.DELETE]);

    const handleChangePage = (_event: React.ChangeEvent<unknown>, value: number) => {
        onPageChange(value);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const currentData = blogs;

    const router = useAdminRouter();
    const { mutate: deleteBlog } = useDeleteBlog();
    const { mutate: updateBlog } = useUpdateBlog();

    const STATUS_ACTIONS: Record<string, { value: string; label: string; color?: string; icon: "publish" | "schedule" | "draft" | "unpublish" }[]> = {
        [BLOG_STATUS.DRAFT]: [
            { value: BLOG_STATUS.PUBLISHED, label: "Đăng bài", color: "var(--palette-success-dark)", icon: "publish" },
            { value: BLOG_STATUS.SCHEDULED, label: "Lên lịch", color: "var(--palette-info-dark)", icon: "schedule" },
        ],
        [BLOG_STATUS.UNPUBLISHED]: [
            { value: BLOG_STATUS.PUBLISHED, label: "Đăng lại", color: "var(--palette-success-dark)", icon: "publish" },
            { value: BLOG_STATUS.SCHEDULED, label: "Lên lịch", color: "var(--palette-info-dark)", icon: "schedule" },
        ],
        [BLOG_STATUS.PUBLISHED]: [{ value: BLOG_STATUS.UNPUBLISHED, label: "Gỡ bài xuống", color: "var(--palette-text-primary)", icon: "unpublish" }],
        [BLOG_STATUS.SCHEDULED]: [
            { value: BLOG_STATUS.PUBLISHED, label: "Đăng ngay", color: "var(--palette-success-dark)", icon: "publish" },
            { value: BLOG_STATUS.DRAFT, label: "Hủy lịch", color: "var(--palette-warning-dark)", icon: "draft" },
        ],
    };

    const getStatusActionIcon = (icon: "publish" | "schedule" | "draft" | "unpublish") => {
        if (icon === 'publish') {
            return <SvgIcon viewBox="0 0 24 24" sx={{ width: 20, height: 20 }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" /></SvgIcon>;
        }
        if (icon === 'draft') {
            return <SvgIcon viewBox="0 0 24 24" sx={{ width: 20, height: 20 }}><path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z" /></SvgIcon>;
        }
        if (icon === 'schedule') {
            return <SvgIcon viewBox="0 0 24 24" sx={{ width: 20, height: 20 }}><path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1zm12 8H5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8zm-6-3a1 1 0 0 0-1 1v3.382l2.447 1.223a1 1 0 0 0 .894-1.788L14 10.118V8a1 1 0 0 0-1-1z" /></SvgIcon>;
        }
        return <SvgIcon viewBox="0 0 24 24" sx={{ width: 20, height: 20 }}><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27z" /></SvgIcon>;
    };

    const handleDelete = (blogId: string) => {
        confirmDelete("Bạn có chắc chắn muốn xóa mục này?", () => {
            deleteBlog(blogId, {
                onSuccess: (res: any) => {
                    if (res.success) {
                        toast.success("Thành công");
                    } else {
                        toast.error(res.message);
                    }
                }
            });
        });
    };

    const handleChangeStatus = (blogId: string, newStatus: string) => {
        if (newStatus === BLOG_STATUS.SCHEDULED) {
            router.push(`/${prefixAdmin}/blog/edit/${blogId}`);
            return;
        }

        const runUpdate = () => {
            updateBlog(
                {
                    id: blogId,
                    data: {
                        status: newStatus,
                        scheduledAt: newStatus === BLOG_STATUS.PUBLISHED || newStatus === BLOG_STATUS.DRAFT || newStatus === BLOG_STATUS.UNPUBLISHED
                            ? null
                            : undefined,
                    }
                },
                {
                    onSuccess: (res: any) => {
                        if (res.success) toast.success("Đã đổi trạng thái thành công");
                        else toast.error(res.message || "Đổi trạng thái thất bại");
                    },
                    onError: () => toast.error("Có lỗi xảy ra"),
                }
            );
        };

        if (newStatus === BLOG_STATUS.UNPUBLISHED) {
            confirmAction(
                "Xác nhận gỡ bài?",
                "Hành động này sẽ ẩn bài viết khỏi trang Khách hàng. Xác nhận gỡ?",
                runUpdate,
                "warning"
            );
            return;
        }

        runUpdate();
    };

    const buildBlogMenuItems = (blog: any): AdminRowActionsMenuItem[] => {
        const blogId = blog.id || blog._id;
        const status = (blog.status || BLOG_STATUS.DRAFT).toLowerCase();
        const items: AdminRowActionsMenuItem[] = [
            {
                id: 'view',
                label: 'Chi tiết',
                icon: 'view',
                onClick: () => router.push(`/${prefixAdmin}/blog/detail/${blogId}`),
            },
        ];

        if (canEdit) {
            items.push({
                id: 'edit',
                label: 'Chỉnh sửa',
                icon: 'edit',
                onClick: () => router.push(`/${prefixAdmin}/blog/edit/${blogId}`),
            });

            (STATUS_ACTIONS[status] || []).forEach((action) => {
                items.push({
                    id: `status-${action.value}`,
                    label: action.label,
                    icon: getStatusActionIcon(action.icon),
                    onClick: () => handleChangeStatus(blogId, action.value),
                    sx: { color: action.color || 'inherit' },
                });
            });
        }

        if (canDelete && status !== BLOG_STATUS.PUBLISHED) {
            items.push({
                id: 'delete',
                label: 'Xóa',
                icon: 'delete',
                onClick: () => handleDelete(blogId),
                danger: true,
            });
        }

        return items;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case BLOG_STATUS.PUBLISHED:
                return { color: "#006C9C", bgColor: "#00B8D929", label: "Xuất bản" };
            case 'archived':
            case BLOG_STATUS.UNPUBLISHED:
                return { color: "var(--palette-error-main)", bgColor: "var(--palette-error-main)29", label: "Đã gỡ xuống" };
            case BLOG_STATUS.SCHEDULED:
                return { color: "var(--palette-info-dark)", bgColor: "var(--palette-info-main)29", label: "Hẹn giờ" };
            case BLOG_STATUS.DRAFT:
            default:
                return { color: "#B76E00", bgColor: "#FFAB0029", label: "Bản nháp" };
        }
    };

    const columns: GridColDef[] = [
        {
            field: "title",
            headerName: "Bài viết",
            flex: 1,
            minWidth: 320,
            renderCell: (params) => {
                const { title, featuredImage, id, _id } = params.row;
                const blogId = _id || id;
                return (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            py: "calc(2 * var(--spacing))",
                            gap: "calc(2 * var(--spacing))",
                            width: "100%",
                        }}>
                        <Avatar
                            alt={title}
                            src={featuredImage || "https://api-prod-minimal-v700.pages.dev/assets/images/cover/cover-1.webp"}
                            variant="rounded"
                            sx={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "var(--shape-borderRadius-md, 8px)",
                                backgroundColor: 'var(--palette-background-neutral)'
                            }}
                        />
                        <ListItemText
                            primary={
                                <Link
                                    href={`/${prefixAdmin}/blog/edit/${blogId}`}
                                    style={{
                                        color: "var(--palette-text-primary)",
                                        fontWeight: 600,
                                        fontSize: '0.8125rem',
                                        textDecoration: 'none',
                                    }}
                                    className="hover:underline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        router.push(`/${prefixAdmin}/blog/detail/${blogId}`);
                                    }}
                                >
                                    {title}
                                </Link>
                            }
                            sx={{ m: 0 }}
                        />
                    </Box>
                );
            }
        },
        {
            field: "createdAt",
            headerName: "Thời gian tạo",
            width: 180,
            valueGetter: (value) => value ? new Date(value) : null,
            renderCell: (params) => {
                const status = (params.row.status || "").toLowerCase();
                const scheduleTime = params.row.scheduledAt;
                const displayValue = status === BLOG_STATUS.SCHEDULED && scheduleTime ? scheduleTime : params.value;
                if (!displayValue) return null;
                const dateObj = dayjs(displayValue);
                if (!dateObj.isValid()) return null;
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: "4px" }}>
                        <span style={{ fontSize: "0.875rem", color: "var(--palette-text-primary)", textTransform: 'capitalize' }}>
                            {dateObj.format('DD MMM, YYYY')}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--palette-text-secondary)", textTransform: 'lowercase' }}>
                            {status === BLOG_STATUS.SCHEDULED
                                ? `dự kiến ${dateObj.format('HH:mm')}`
                                : dateObj.format('hh:mm A')}
                        </span>
                    </Box>
                );
            }
        },
        {
            field: "status",
            headerName: "Trạng thái",
            width: 140,
            renderCell: (params) => {
                const statusInfo = getStatusColor(params.row.status);
                return (
                    <span className="inline-flex items-center justify-center leading-1.5 min-w-[1.5rem] h-[1.5rem] text-[0.75rem] px-[6px] font-[700] rounded-[6px] cursor-default"
                        style={{
                            backgroundColor: statusInfo.bgColor,
                            color: statusInfo.color,
                        }}
                    >
                        {statusInfo.label}
                    </span>
                );
            }
        },
        {
            field: "viewCount",
            headerName: "Lượt xem",
            width: 120,
            valueGetter: (value) => value || 0,
        },
        ...(showRowActions ? [{
            field: 'actions',
            headerName: '',
            width: 80,
            sortable: false,
            filterable: false,
            align: 'right' as const,
            renderCell: (params: any) => (
                <AdminRowActionsMenu items={buildBlogMenuItems(params.row)} />
            )
        }] : []),
    ];

    if (viewMode === 'grid' && (isLoading || blogs.length === 0)) {
        return (
            <Box sx={{ height: 640, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isLoading
                    ? <CircularProgress color="inherit" />
                    : <span className="text-[1.125rem]">Chưa có dữ liệu</span>}
            </Box>
        );
    }

    return (
        <>
            {viewMode === 'list' ? (
                <Card elevation={0} className="admin-datagrid-card">
                    <LazyDataGrid
                        rows={currentData.map(b => ({ ...b, id: b._id || b.id }))}
                        getRowId={(row) => row.id}
                        loading={isLoading}
                        columns={columns}
                        density="comfortable"
                        disableColumnMenu
                        disableColumnSorting
                        className="admin-datagrid"
                        sx={dataGridStyles}
                        slots={{
                            noRowsOverlay: () => (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    {isLoading ? <CircularProgress size={32} /> : <span className='text-[1.125rem]'>Chưa có dữ liệu</span>}
                                </Box>
                            )
                        }}
                        localeText={DATA_GRID_LOCALE_VN}
                        hideFooterPagination
                        getRowHeight={() => 'auto'}
                        disableRowSelectionOnClick
                    />
                </Card>
            ) : (
                <Box
                    sx={{
                        display: "grid",
                        gap: "calc(3 * var(--spacing))",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        p: "20px",
                    }}
                >
                    {currentData.map((blog: any) => {
                        const statusInfo = getStatusColor(blog.status);
                        const formattedDate = dayjs(blog.createdAt).format('DD/MM/YYYY');

                        return (
                            <Card
                                key={blog.id || blog._id}
                                sx={{
                                    backgroundColor: "var(--palette-background-paper)",
                                    color: "var(--palette-text-primary)",
                                    backgroundImage: "none",
                                    boxShadow: "var(--customShadows-card)",
                                    position: "relative",
                                    borderRadius: "var(--shape-borderRadius-lg)",
                                    display: "flex",
                                }}
                            >
                                <Stack
                                    sx={{
                                        padding: "24px 24px 16px",
                                        gap: "8px",
                                        flex: 1,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            mb: "16px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <span className="h-[24px] min-w-[24px] px-[6px] rounded-[6px] font-[700] text-[0.75rem] inline-flex items-center" style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}>
                                            {statusInfo.label}
                                        </span>
                                        <span className="font-[400] text-[0.75rem] text-[var(--palette-text-disabled)]">
                                            {formattedDate}
                                        </span>
                                    </Box>

                                    <Stack sx={{ flex: 1, gap: "8px" }}>
                                        <Link
                                            className="text-[0.875rem] font-[600] leading-[1.57143] line-clamp-2 hover:underline"
                                            href={`/${prefixAdmin}/blog/detail/${blog.id || blog._id}`}
                                        >
                                            {blog.title}
                                        </Link>
                                        {(blog.summary || blog.excerpt || blog.metaDescription) && (
                                            <p className="text-[0.875rem] line-clamp-2 text-[var(--palette-text-secondary)] leading-[1.57143]">
                                                {blog.summary || blog.excerpt || blog.metaDescription}
                                            </p>
                                        )}
                                    </Stack>

                                    <Box sx={{ display: "flex", alignItems: "center" }}>
                                        {showRowActions && (
                                            <AdminRowActionsMenu items={buildBlogMenuItems(blog)} />
                                        )}

                                        <Box
                                            sx={{
                                                gap: "12px",
                                                flex: 1,
                                                display: "flex",
                                                fontSize: "0.75rem",
                                                color: "var(--palette-text-disabled)",
                                                justifyContent: "flex-end",
                                            }}
                                        >
                                            <div className="gap-[4px] flex items-center">
                                                <EyeIcon
                                                    sx={{
                                                        color: "inherit",
                                                        fontSize: 16,
                                                        mr: 0,
                                                    }}
                                                />
                                                {blog.viewCount || 0}
                                            </div>
                                        </Box>
                                    </Box>
                                </Stack>

                                <Box
                                    sx={{
                                        p: "8px",
                                        width: "180px",
                                        minWidth: "180px",
                                        height: "240px",
                                        position: "relative",
                                        flexShrink: 0,
                                    }}
                                >
                                    <span style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', borderRadius: '12px', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                                        <img
                                            src={blog.featuredImage || "https://api-prod-minimal-v700.pages.dev/assets/images/cover/cover-1.webp"}
                                            alt={blog.title}
                                            style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'contain', display: 'block', backgroundColor: '#fff' }}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "https://api-prod-minimal-v700.pages.dev/assets/images/cover/cover-1.webp";
                                            }}
                                        />
                                    </span>
                                </Box>

                            </Card>
                        );
                    })}
                </Box>
            )}

            <Pagination
                count={pagination.totalPages || 0}
                page={page}
                onChange={handleChangePage}
                shape="circular"
                sx={{
                    mt: "64px",
                    "& .MuiPaginationItem-root": {
                        fontSize: "0.875rem",
                        color: "var(--palette-text-primary)",
                        lineHeight: "1.57143"
                    },
                    "& .Mui-disabled": {
                        opacity: "0.48"
                    },
                    '& .MuiSvgIcon-root': {
                        width: "1.25rem",
                        height: "1.25rem"
                    },
                    "& .Mui-selected": {
                        backgroundColor: "var(--palette-text-primary) !important",
                        color: "var(--palette-common-white)",
                        fontWeight: 600,
                    },
                    '& .MuiPagination-ul': {
                        justifyContent: "center"
                    },
                }}
            />

        </>
    );
};
