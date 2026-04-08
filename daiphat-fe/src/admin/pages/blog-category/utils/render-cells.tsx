import { Avatar, Box, Link, ListItemText } from "@mui/material";
import { GridActionsCell, GridActionsCellItem, GridRenderCellParams } from "@mui/x-data-grid";
import { DeleteIcon, EditIcon, EyeIcon } from "../../../assets/icons/index";
import { COLORS } from "../configs/constants";
import { useDeleteBlogCategory, useForceDeleteBlogCategory, useRestoreBlogCategory } from "../hooks/useBlogCategory";
import { useNavigate } from "react-router-dom";
import { prefixAdmin } from "../../../constants/routes";
import { toast } from "react-toastify";
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { confirmDelete } from "../../../utils/swal";

dayjs.locale('vi');
interface RenderCreatedAtCellProps {
    value: Date | null | any;
}

// Sản phẩm
export const RenderTitleCell = (params: GridRenderCellParams) => {
    const { name, avatar, altImage, _id } = params.row;
    const navigate = useNavigate();

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
                alt={altImage || name}
                src={avatar}
                variant="rounded"
                sx={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "var(--shape-borderRadius-md)",
                    backgroundColor: 'var(--palette-background-neutral)'
                }}
            />

            <ListItemText
                primary={
                    <Link
                        href={`/${prefixAdmin}/blog-category/edit/${_id}`}
                        className="ticket-title"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate(`/${prefixAdmin}/blog-category/edit/${_id}`);
                        }}
                        underline="hover"
                        sx={{
                            color: COLORS.primary,
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

    // Định dạng: 16 thg 01, 2026
    const formattedDate = dateObj.format('DD MMM, YYYY');

    // Định dạng: 10:17 SA/CH (hoặc am/pm tùy bạn)
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
                    color: COLORS.primary,
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
                    color: COLORS.secondary,
                    textTransform: 'lowercase'
                }}
            >
                {formattedTime}
            </Box>
        </Box >
    );
}


// Status
export const RenderStatusCell = (params: GridRenderCellParams) => {
    const status = params.row.status;

    let label = "Hoạt động";
    let bg = "var(--palette-info-lighter)";
    let text = "var(--palette-info-dark)";

    if (status === 'active') {
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
export const getRenderActionsCell = (isTrash: boolean) => (params: GridRenderCellParams) => {
    const navigate = useNavigate();
    const { mutate: deleteCategory } = useDeleteBlogCategory();
    const { mutate: forceDeleteCategory } = useForceDeleteBlogCategory();
    const { mutate: restoreCategory } = useRestoreBlogCategory();
    const _id = params.row._id;

    const handleEdit = () => {
        navigate(`/${prefixAdmin}/blog-category/edit/${_id}`);
    };

    const handleDelete = () => {
        const message = isTrash ? "Bạn có chắc chắn muốn xóa vĩnh viễn danh mục này?" : "Bạn có chắc chắn muốn xóa danh mục này?";
        const action = isTrash ? forceDeleteCategory : deleteCategory;

        confirmDelete(message, () => {
            action(_id, {
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

    const handleRestore = () => {
        restoreCategory(_id, {
            onSuccess: (res: any) => {
                if (res.success) {
                    toast.success("Khôi phục danh mục thành công");
                } else {
                    toast.error(res.message);
                }
            }
        });
    };

    return (
        <GridActionsCell {...params}>
            {!isTrash ? (
                <>
                    <GridActionsCellItem
                        icon={<EyeIcon />}
                        label="Chi tiết"
                        showInMenu
                        {...({
                            sx: {
                                '& .MuiTypography-root': {
                                    fontSize: '0.8125rem',
                                    fontWeight: "600"
                                },
                            },
                        } as any)}
                        onClick={() => navigate(`/${prefixAdmin}/blog-category/detail/${_id}`)}
                    />
                    <GridActionsCellItem
                        icon={<EditIcon />}
                        label="Chỉnh sửa"
                        showInMenu
                        {...({
                            sx: {
                                '& .MuiTypography-root': {
                                    fontSize: '0.8125rem',
                                    fontWeight: "600"
                                },
                            },
                        } as any)}
                        onClick={handleEdit}
                    />
                </>
            ) : (
                <GridActionsCellItem
                    icon={<EyeIcon />} // Should be restore icon ideally, reusing EyeIcon briefly or I can import RestoreIcon
                    label="Khôi phục"
                    showInMenu
                    {...({
                        sx: {
                            '& .MuiTypography-root': {
                                fontSize: '0.8125rem',
                                fontWeight: "600",
                                color: "var(--palette-info-main)"
                            },
                        },
                    } as any)}
                    onClick={handleRestore}
                />
            )}
            <GridActionsCellItem
                icon={<DeleteIcon />}
                // Update label dynamically based on isTrash
                label={isTrash ? "Xóa vĩnh viễn" : "Xóa"}
                showInMenu
                {...({
                    sx: {
                        '& .MuiTypography-root': {
                            fontSize: '0.8125rem',
                            fontWeight: "600",
                            color: "var(--palette-error-main)"
                        },
                    },
                } as any)}
                onClick={handleDelete}
            />
        </GridActionsCell>
    );
}





