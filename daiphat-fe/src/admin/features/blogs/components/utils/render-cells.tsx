"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { Avatar, Box, Link, ListItemText } from "@mui/material";
import { PERMISSIONS } from "../../../../constants/permission.constants";

import { GridRenderCellParams } from "@mui/x-data-grid";
import { useDeleteBlogCategory } from "../../hooks/useBlogCategory";
import { prefixAdmin } from "../../../../constants/routes";
import { toast } from "react-toastify";
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { confirmDelete } from "../../../../utils/swal";
import { usePermissions } from "../../../../hooks/usePermission";
import { AdminRowActionsMenu, type AdminRowActionsMenuItem } from "../../../../components/ui/AdminRowActionsMenu";

dayjs.locale('vi');

interface RenderCreatedAtCellProps {
    value: Date | null | any;
}

// Tên danh mục + Icon/Avatar
export const RenderTitleCell = (params: GridRenderCellParams) => {
    const { name, avatar, altImage, _id } = params.row;
    const router = useAdminRouter();

    // avatar có thể là font-awesome class (vd: "fa-solid fa-star") hoặc URL ảnh
    const isFaIcon = avatar && typeof avatar === 'string' && avatar.startsWith('fa-');
    const isValidUrl = avatar && typeof avatar === 'string' && (avatar.startsWith('http') || avatar.startsWith('/'));

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                py: "calc(2 * var(--spacing))",
                gap: "calc(2 * var(--spacing))",
                width: "100%",
            }}>

            {isFaIcon ? (
                <Box
                    sx={{
                        width: '64px',
                        height: '64px',
                        borderRadius: 'var(--shape-borderRadius-md)',
                        backgroundColor: 'var(--palette-background-neutral)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '1.5rem',
                        color: 'var(--palette-text-secondary)',
                    }}
                >
                    <i className={avatar} />
                </Box>
            ) : (
                <Avatar
                    alt={altImage || name}
                    src={isValidUrl ? avatar : undefined}
                    variant="rounded"
                    sx={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "var(--shape-borderRadius-md)",
                        backgroundColor: 'var(--palette-background-neutral)'
                    }}
                />
            )}

            <ListItemText
                primary={
                    <Link
                        href={`/${prefixAdmin}/blog-category/edit/${_id}`}
                        className="ticket-title"
                        onClick={(e) => {
                            e.preventDefault();
                            router.push(`/${prefixAdmin}/blog-category/edit/${_id}`);
                        }}
                        underline="hover"
                        sx={{
                            color: "var(--palette-primary-main)",
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            transition: 'color 0.2s',
                        }}
                    >
                        {name}
                    </Link>
                }
                slotProps={{
                    primary: {
                        component: 'span',
                        variant: 'body1',
                        noWrap: true,
                    },
                }}
                sx={{ m: 0 }}
            />
        </Box>
    );
}

// Thời gian tạo
export const RenderCreatedAtCell = ({ value }: RenderCreatedAtCellProps) => {
    if (!value) return null;
    const dateObj = dayjs(value);
    if (!dateObj.isValid()) return null;

    const formattedDate = dateObj.format('DD MMM, YYYY');
    const formattedTime = dateObj.format('hh:mm A');

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: "4px"
            }}>

            <span
                style={{
                    fontSize: "0.875rem",
                    color: "var(--palette-primary-main)",
                    transition: 'color 0.2s',
                    textTransform: 'capitalize'
                }}>
                {formattedDate}
            </span>

            <Box
                className="date-text"
                component='span'
                sx={{
                    fontSize: "0.75rem",
                    color: "var(--palette-secondary-main)",
                    textTransform: 'lowercase'
                }}
            >
                {formattedTime}
            </Box>
        </Box>
    );
}


// Status
export const RenderStatusCell = (params: GridRenderCellParams) => {
    const status = params.row.status;

    let label = "Hoạt động";
    let bg = "var(--palette-info-lighter)";
    let text = "var(--palette-info-dark)";

    if (status && status.toUpperCase() === 'ACTIVE') {
        label = "Hoạt động";
        bg = "var(--palette-info-lighter)";
        text = "var(--palette-info-dark)";
    } else {
        label = "Tạm dừng";
        bg = "var(--palette-error-lighter)";
        text = "var(--palette-error-dark)";
    }

    return (
        <span
            className="inline-flex items-center justify-center leading-1.5 min-w-[1.5rem] h-[1.5rem] text-[0.75rem] px-[6px] font-[700] rounded-[6px]"
            style={{
                backgroundColor: bg,
                color: text,
            }}
        >
            {label}
        </span>
    );
}

// Actions
export const BlogCategoryActionsCell = (_isTrash: boolean) => (params: GridRenderCellParams) => {
    const router = useAdminRouter();
    const { mutate: deleteCategory } = useDeleteBlogCategory();
    const { can } = usePermissions();
    const canEdit = can(PERMISSIONS.ARTICLE.EDIT);
    const canDelete = can(PERMISSIONS.ARTICLE.DELETE);
    const _id = params.row.id || params.row.id;

    const handleEdit = () => {
        router.push(`/${prefixAdmin}/blog-category/edit/${_id}`);
    };

    const handleDelete = () => {
        const message = "Bạn có chắc chắn muốn xóa danh mục này?";
        confirmDelete(message, () => {
            deleteCategory(_id, {
                onSuccess: (res: any) => {
                    if (res.success) {
                        toast.success("Xóa danh mục thành công");
                    } else {
                        toast.error(res.message);
                    }
                }
            });
        });
    };

    const items: AdminRowActionsMenuItem[] = [
        {
            id: 'view',
            label: 'Chi tiết',
            icon: 'view',
            onClick: () => router.push(`/${prefixAdmin}/blog-category/detail/${_id}`),
        },
    ];

    if (canEdit) {
        items.push({
            id: 'edit',
            label: 'Chỉnh sửa',
            icon: 'edit',
            onClick: handleEdit,
        });
    }

    if (canDelete) {
        items.push({
            id: 'delete',
            label: 'Xóa',
            icon: 'delete',
            onClick: handleDelete,
            danger: true,
        });
    }

    return <AdminRowActionsMenu items={items} />;
}

export const getRenderActionsCell = BlogCategoryActionsCell;
