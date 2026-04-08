import { useState } from "react";
import { Box, ButtonBase, Card, Pagination, Stack, CircularProgress, Popover, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { useTranslation } from "react-i18next";
import { DeleteIcon, EditIcon, EyeIcon, ThreeDotsIcon } from "../../../assets/icons";
import RestoreIcon from '@mui/icons-material/Restore';
import { prefixAdmin } from "../../../constants/routes";

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
    isTrash?: boolean;
}

export const BlogList = ({ blogs = [], isLoading = false, page, onPageChange, pagination, isTrash }: BlogListProps) => {
    const { t } = useTranslation();

    const handleChangePage = (_event: React.ChangeEvent<unknown>, value: number) => {
        onPageChange(value);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const currentData = blogs;

    const navigate = useNavigate();
    const { mutate: deleteBlog } = useDeleteBlog();
    const { mutate: restoreBlog } = useRestoreBlog();
    const { mutate: forceDeleteBlog } = useForceDeleteBlog();
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
            const message = isTrash ? "Bạn có chắc chắn muốn xóa vĩnh viễn bài này?" : t("admin.common.confirm_delete");
            const action = isTrash ? forceDeleteBlog : deleteBlog;

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

    const handleRestore = () => {
        if (selectedBlogId) {
            restoreBlog(selectedBlogId, {
                onSuccess: (res: any) => {
                    if (res.success) {
                        toast.success("Khôi phục thành công");
                    } else {
                        toast.error(res.message);
                    }
                }
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
                            key={blog.id}
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
                                        to={`/${prefixAdmin}/blog/detail/${blog.id}`}
                                    >
                                        {blog.title}
                                    </Link>
                                    <p className="text-[0.875rem] line-clamp-2 text-[var(--palette-text-secondary)] leading-[1.57143]">
                                        {blog.excerpt || blog.metaDescription || "..."}
                                    </p>
                                </Stack>

                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                    <ButtonBase
                                        onClick={(e) => handleOpenMenu(e, blog.id)}
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
                                    height: "240px",
                                    position: "relative",
                                }}
                            >
                                <span className="max-w-[100%] h-full overflow-hidden relative rounded-[12px] inline-block">
                                    <img
                                        src={blog.featuredImage || "https://api-prod-minimal-v700.pages.dev/assets/images/cover/cover-1.webp"}
                                        alt={blog.title}
                                        className="w-full h-full rounded-[12px] object-cover"
                                    />
                                </span>
                            </Box>
                        </Card>
                    );
                })}
            </Box>

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
                {!isTrash ? (
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
                ) : (
                    <>
                        <MenuItem onClick={handleRestore} sx={{ borderRadius: "var(--shape-borderRadius-sm)", py: 1, color: 'info.main' }}>
                            <ListItemIcon sx={{ minWidth: '24px !important', mr: 1, color: 'info.main' }}>
                                <RestoreIcon sx={{ width: 20, height: 20 }} />
                            </ListItemIcon>
                            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>Khôi phục</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={handleDelete} sx={{ borderRadius: "var(--shape-borderRadius-sm)", py: 1, color: 'error.main' }}>
                            <ListItemIcon sx={{ minWidth: '24px !important', mr: 1, color: 'error.main' }}>
                                <DeleteIcon sx={{ width: 20, height: 20 }} />
                            </ListItemIcon>
                            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>Xóa vĩnh viễn</ListItemText>
                        </MenuItem>
                    </>
                )}
            </Popover>

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



