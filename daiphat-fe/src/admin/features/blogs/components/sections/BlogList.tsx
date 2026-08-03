"use client";

import { useState } from "react";
import { PERMISSIONS } from "../../../../constants/permission.constants";

import { Box, ButtonBase, Card, Pagination, Stack, CircularProgress, Popover, MenuItem, ListItemIcon, ListItemText, Avatar, SvgIcon } from "@mui/material";
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useTranslation } from "react-i18next";
import { DeleteIcon, EditIcon, EyeIcon, ThreeDotsIcon, SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from "../../../../assets/icons";
import { prefixAdmin } from "../../../../constants/routes";
import { DATA_GRID_LOCALE_VN } from "../../../../../shared/components/DataTable/localeText.config";
import { dataGridStyles } from "../../../../shared/data-grid";

import dayjs from "dayjs";
import 'dayjs/locale/vi';

import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
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
    const { t } = useTranslation();
    const { can, canAny } = usePermissions();
    const canEdit = can(PERMISSIONS.ARTICLE.EDIT);
    const canDelete = can(PERMISSIONS.ARTICLE.DELETE);
    const showRowActions = canAny([PERMISSIONS.ARTICLE.EDIT, PERMISSIONS.ARTICLE.DELETE]);

    const handleChangePage = (_event: React.ChangeEvent<unknown>, value: number) => {
        onPageChange(value);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const currentData = blogs;

    const navigate = useNavigate();
    const { mutate: deleteBlog } = useDeleteBlog();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);
    const [selectedBlogStatus, setSelectedBlogStatus] = useState<string>(BLOG_STATUS.DRAFT);
    const { mutate: updateBlog } = useUpdateBlog();

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, id: string, status?: string) => {
        setAnchorEl(event.currentTarget);
        setSelectedBlogId(id);
        setSelectedBlogStatus((status || BLOG_STATUS.DRAFT).toLowerCase());
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedBlogId(null);
    };

    const handleEdit = () => {
        if (selectedBlogId) {
            navigate(`/${prefixAdmin}/blog/edit/${selectedBlogId}`);
            handleCloseMenu();
        }
    };

    const handleDelete = () => {
        if (selectedBlogId) {
            const message = t("admin.common.confirm_delete");
            const action = deleteBlog;

            confirmDelete(message, () => {
                action(selectedBlogId, {
                    onSuccess: (res: any) => {
                        if (res.success) {
                            toast.success(t("admin.common.success"));
                        } else {
                            toast.error(res.message);
                        }
                    }
                });
            });
            handleCloseMenu();
        }
    };

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

    const handleChangeStatus = (newStatus: string) => {
        if (!selectedBlogId) return;

        if (newStatus === BLOG_STATUS.SCHEDULED) {
            navigate(`/${prefixAdmin}/blog/edit/${selectedBlogId}`);
            handleCloseMenu();
            return;
        }

        const runUpdate = () => {
            updateBlog(
                {
                    id: selectedBlogId,
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
            handleCloseMenu();
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case BLOG_STATUS.PUBLISHED:
                return { color: "#006C9C", bgColor: "#00B8D929", label: t("admin.blog.status.published") };
            case 'archived':
            case BLOG_STATUS.UNPUBLISHED:
                return { color: "var(--palette-error-main)", bgColor: "var(--palette-error-main)29", label: "Đã gỡ xuống" };
            case BLOG_STATUS.SCHEDULED:
                return { color: "var(--palette-info-dark)", bgColor: "var(--palette-info-main)29", label: "Hẹn giờ" };
            case BLOG_STATUS.DRAFT:
            default:
                return { color: "#B76E00", bgColor: "#FFAB0029", label: t("admin.blog.status.draft") };
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
                                    to={`/${prefixAdmin}/blog/edit/${blogId}`}
                                    style={{
                                        color: "var(--palette-text-primary)",
                                        fontWeight: 600,
                                        fontSize: '0.8125rem',
                                        textDecoration: 'none',
                                    }}
                                    className="hover:underline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        navigate(`/${prefixAdmin}/blog/detail/${blogId}`);
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
                <ButtonBase
                    onClick={(e) => handleOpenMenu(e, params.row.id || params.row.id, params.row.status)}
                    sx={{
                        color: "var(--palette-text-secondary)",
                        p: "8px",
                        borderRadius: "50%",
                        rotate: "90deg",
                        transition: "background-color 150ms",
                        "&:hover": {
                            backgroundColor: "var(--palette-text-secondary)14",
                        },
                    }}
                >
                    <ThreeDotsIcon />
                </ButtonBase>
            )
        }] : []),
    ];

    if (viewMode === 'grid' && (isLoading || blogs.length === 0)) {
        return (
            <Box sx={{ height: 640, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isLoading
                    ? <CircularProgress color="inherit" />
                    : <span className="text-[1.125rem]">{t("admin.common.no_data")}</span>}
            </Box>
        );
    }

    return (
        <>
            {viewMode === 'list' ? (
                <Box sx={{ height: 640, width: '100%', display: 'flex', flexDirection: 'column' }}>
                    <DataGrid
                        rows={currentData.map(b => ({ ...b, id: b._id || b.id }))}
                        getRowId={(row) => row.id}
                        loading={isLoading}
                        columns={columns}
                        density="comfortable"
                        className="admin-datagrid"
                    sx={dataGridStyles}
                        slots={{
                            columnSortedAscendingIcon: SortAscendingIcon,
                            columnSortedDescendingIcon: SortDescendingIcon,
                            columnUnsortedIcon: UnsortedIcon,
                            noRowsOverlay: () => (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    {isLoading ? <CircularProgress size={32} /> : <span className='text-[1.125rem]'>{t("admin.common.no_data")}</span>}
                                </Box>
                            )
                        }}
                        localeText={DATA_GRID_LOCALE_VN}
                        hideFooterPagination
                        getRowHeight={() => 'auto'}
                        disableRowSelectionOnClick
                    />
                </Box>
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
                                            to={`/${prefixAdmin}/blog/detail/${blog.id || blog._id}`}
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
                                            <ButtonBase
                                                onClick={(e) => handleOpenMenu(e, blog.id || blog._id, blog.status)}
                                                sx={{
                                                    color: "var(--palette-text-secondary)",
                                                    p: "8px",
                                                    borderRadius: "50%",
                                                    rotate: "90deg",
                                                    transition: "background-color 150ms",
                                                    "&:hover": {
                                                        backgroundColor: "var(--palette-text-secondary)14",
                                                    },
                                                }}
                                            >
                                                <ThreeDotsIcon />
                                            </ButtonBase>
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

            <Popover
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                PaperProps={{
                    sx: {
                        marginTop: "-8px",
                        width: 180,
                        boxShadow: '0 0 2px 0 rgba(145, 158, 171, 0.24), 0 20px 40px -4px rgba(145, 158, 171, 0.24)',
                        padding: '4px',
                        borderRadius: '10px',
                        overflow: 'visible',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            bottom: -7,
                            right: 20,
                            width: 12,
                            height: 12,
                            backgroundColor: 'background.paper',
                            transform: 'rotate(45deg)',
                            borderRight: '1px solid rgba(145, 158, 171, 0.12)',
                            borderBottom: '1px solid rgba(145, 158, 171, 0.12)',
                            zIndex: 1,
                        }
                    },
                }}
            >
                <>
                    <MenuItem onClick={() => {
                        navigate(`/${prefixAdmin}/blog/detail/${selectedBlogId}`);
                        handleCloseMenu();
                    }} sx={{ borderRadius: "var(--shape-borderRadius-sm)", py: 1 }}>
                        <ListItemIcon sx={{ minWidth: '24px !important', mr: 1.5 }}>
                            <EyeIcon sx={{ width: 20, height: 20, mr: 0 }} />
                        </ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>{t("admin.common.details")}</ListItemText>
                    </MenuItem>
                    {canEdit && (
                        <MenuItem onClick={handleEdit} sx={{ borderRadius: "var(--shape-borderRadius-sm)", py: 1 }}>
                            <ListItemIcon sx={{ minWidth: '24px !important', mr: 1.5 }}>
                                <EditIcon sx={{ width: 20, height: 20, mr: 0 }} />
                            </ListItemIcon>
                            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>{t("admin.common.edit")}</ListItemText>
                        </MenuItem>
                    )}

                    {canEdit && (STATUS_ACTIONS[selectedBlogStatus] || []).length > 0 && (
                        <>
                            {(STATUS_ACTIONS[selectedBlogStatus] || []).map((action) => (
                                <MenuItem
                                    key={action.value}
                                    onClick={() => handleChangeStatus(action.value)}
                                    sx={{ borderRadius: "var(--shape-borderRadius-sm)", py: 1, color: action.color || 'inherit' }}
                                >
                                    <ListItemIcon sx={{ minWidth: '24px !important', mr: 1.5, color: action.color || 'inherit' }}>
                                        {action.icon === 'publish'
                                            ? <SvgIcon viewBox="0 0 24 24" sx={{ width: 20, height: 20, mr: 0 }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" /></SvgIcon>
                                            : action.icon === 'draft'
                                                ? <SvgIcon viewBox="0 0 24 24" sx={{ width: 20, height: 20, mr: 0 }}><path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z" /></SvgIcon>
                                                : action.icon === 'schedule'
                                                    ? <SvgIcon viewBox="0 0 24 24" sx={{ width: 20, height: 20, mr: 0 }}><path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1zm12 8H5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8zm-6-3a1 1 0 0 0-1 1v3.382l2.447 1.223a1 1 0 0 0 .894-1.788L14 10.118V8a1 1 0 0 0-1-1z" /></SvgIcon>
                                                    : <SvgIcon viewBox="0 0 24 24" sx={{ width: 20, height: 20, mr: 0 }}><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27z" /></SvgIcon>
                                        }
                                    </ListItemIcon>
                                    <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                        {action.label}
                                    </ListItemText>
                                </MenuItem>
                            ))}
                        </>
                    )}

                    {canDelete && selectedBlogStatus !== BLOG_STATUS.PUBLISHED && (
                        <MenuItem onClick={handleDelete} sx={{ borderRadius: "var(--shape-borderRadius-sm)", py: 1, color: 'error.main' }}>
                            <ListItemIcon sx={{ minWidth: '24px !important', mr: 1.5, color: 'error.main' }}>
                                <DeleteIcon sx={{ width: 20, height: 20, mr: 0 }} />
                            </ListItemIcon>
                            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>{t("admin.common.delete")}</ListItemText>
                        </MenuItem>
                    )}
                </>
            </Popover>
        </>
    );
};
