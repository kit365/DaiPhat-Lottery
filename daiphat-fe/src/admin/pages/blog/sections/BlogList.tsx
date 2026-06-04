import { useState } from "react";
import { Box, ButtonBase, Card, Pagination, Stack, CircularProgress, Popover, MenuItem, ListItemIcon, ListItemText, Avatar } from "@mui/material";
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useTranslation } from "react-i18next";
import { DeleteIcon, EditIcon, EyeIcon, ThreeDotsIcon, SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from "../../../assets/icons";
import RestoreIcon from '@mui/icons-material/Restore';
import { prefixAdmin } from "../../../constants/routes";
import { DATA_GRID_LOCALE_VN } from '../../blog-category/configs/localeText.config';
import { dataGridCardStyles, dataGridContainerStyles, dataGridStyles } from '../../blog-category/configs/styles.config';

import dayjs from "dayjs";
import 'dayjs/locale/vi';

import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { confirmDelete } from "../../../utils/swal";
import { useDeleteBlog, useRestoreBlog, useForceDeleteBlog } from "../hooks/useBlog";

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

    const handleChangePage = (_event: React.ChangeEvent<unknown>, value: number) => {
        onPageChange(value);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const currentData = blogs;

    const navigate = useNavigate();
    const { mutate: deleteBlog } = useDeleteBlog();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, id: string) => {
        setAnchorEl(event.currentTarget);
        setSelectedBlogId(id);
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
                return { color: "#006C9C", bgColor: "#00B8D929", label: t("admin.blog.status.published") };
            case 'archived':
                return { color: "var(--palette-error-main)", bgColor: "var(--palette-error-main)29", label: t("admin.blog.status.archived") };
            case 'draft':
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
                if (!params.value) return null;
                const dateObj = dayjs(params.value);
                if (!dateObj.isValid()) return null;
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: "4px" }}>
                        <span style={{ fontSize: "0.875rem", color: "var(--palette-text-primary)", textTransform: 'capitalize' }}>
                            {dateObj.format('DD MMM, YYYY')}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--palette-text-secondary)", textTransform: 'lowercase' }}>
                            {dateObj.format('hh:mm A')}
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
                    <span className="inline-flex items-center justify-center leading-1.5 min-w-[1.5rem] h-[1.5rem] text-[0.75rem] px-[6px] font-[700] rounded-[6px]"
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
        {
            field: 'actions',
            headerName: '',
            width: 80,
            sortable: false,
            filterable: false,
            align: 'right',
            renderCell: (params) => (
                <ButtonBase
                    onClick={(e) => handleOpenMenu(e, params.row._id || params.row.id)}
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
        }
    ];

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress color="inherit" />
            </Box>
        );
    }

    if (blogs.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 5, fontSize: '1rem', color: 'var(--palette-text-secondary)' }}>
                {t("admin.common.no_data")}
            </Box>
        );
    }

    return (
        <>
            {viewMode === 'list' ? (
                <Card elevation={0} sx={dataGridCardStyles}>
                    <div style={dataGridContainerStyles}>
                        <DataGrid
                            rows={currentData.map(b => ({ ...b, id: b._id || b.id }))}
                            getRowId={(row) => row.id}
                            loading={isLoading}
                            columns={columns}
                            density="comfortable"
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
                            sx={dataGridStyles}
                            getRowHeight={() => 'auto'}
                            disableRowSelectionOnClick
                        />
                    </div>
                </Card>
            ) : (
                <Box
                    sx={{
                        display: "grid",
                        gap: "calc(3 * var(--spacing))",
                        gridTemplateColumns: "repeat(2, 1fr)",
                    }}
                >
                    {currentData.map((blog: any) => {
                        const statusInfo = getStatusColor(blog.status);
                        // Định dạng: 16/01/2026
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
                                        <ButtonBase
                                            onClick={(e) => handleOpenMenu(e, blog.id || blog._id)}
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
                                    <span style={{ display: 'block', width: '100%', height: '100%', overflow: 'hidden', borderRadius: '12px', backgroundColor: 'var(--palette-background-neutral)' }}>
                                        <img
                                            src={blog.featuredImage || "https://api-prod-minimal-v700.pages.dev/assets/images/cover/cover-1.webp"}
                                            alt={blog.title}
                                            style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'contain', display: 'block' }}
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
                        width: 140,
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
                        <ListItemIcon sx={{ minWidth: '24px !important', mr: 1 }}>
                            <EyeIcon sx={{ width: 20, height: 20 }} />
                        </ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>{t("admin.common.details")}</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleEdit} sx={{ borderRadius: "var(--shape-borderRadius-sm)", py: 1 }}>
                        <ListItemIcon sx={{ minWidth: '24px !important', mr: 1 }}>
                            <EditIcon sx={{ width: 20, height: 20 }} />
                        </ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>{t("admin.common.edit")}</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleDelete} sx={{ borderRadius: "var(--shape-borderRadius-sm)", py: 1, color: 'error.main' }}>
                        <ListItemIcon sx={{ minWidth: '24px !important', mr: 1, color: 'error.main' }}>
                            <DeleteIcon sx={{ width: 20, height: 20 }} />
                        </ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>{t("admin.common.delete")}</ListItemText>
                    </MenuItem>
                </>
            </Popover>
        </>
    );
};
