import { Avatar, Box, Link, ListItemText } from "@mui/material";
import { GridActionsCell, GridActionsCellItem, GridRenderCellParams } from "@mui/x-data-grid";
import { DeleteIcon, EditIcon, EyeIcon } from "../../../assets/icons/index";
import { useDeleteBlog } from "../../../hooks/useBlog";
import { useNavigate } from "react-router-dom";
import { prefixAdmin } from "../../../constants/routes";
import { AppToast as toast } from '../../../../utils/toast.util';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { COLORS } from "../../../pages/provider/configs/constants"; // Using shared constants or create new ones in blog
import { confirmDelete } from "../../../utils/swal";

dayjs.locale('vi');

interface RenderCreatedAtCellProps {
    value: Date | null | any;
}

export const RenderTitleCell = (params: GridRenderCellParams) => {
    const { title, featuredImage, id } = params.row;
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

            <Box
                onClick={() => navigate(`/${prefixAdmin}/blog/detail/${id}`)}
                sx={{ cursor: 'pointer' }}
            >
                <Avatar
                    alt={title}
                    src={featuredImage}
                    variant="rounded"
                    sx={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "var(--shape-borderRadius-md)",
                        backgroundColor: 'var(--palette-background-neutral)',
                        transition: 'transform 0.2s',
                        '&:hover': {
                            transform: 'scale(1.05)',
                        }
                    }}
                />
            </Box>

            <ListItemText
                primary={
                    <Link
                        href={`/${prefixAdmin}/blog/detail/${id}`}
                        className="ticket-title"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate(`/${prefixAdmin}/blog/detail/${id}`);
                        }}
                        underline="hover"
                        sx={{
                            color: COLORS.primary,
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            transition: 'color 0.2s',
                        }}
                    >
                        {title}
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

export const RenderStatusCell = (params: GridRenderCellParams) => {
    const status = params.row.status?.toUpperCase();

    let label = "Bản nháp";
    let bg = "var(--palette-text-disabled)29";
    let text = "var(--palette-text-secondary)";

    if (status === "PUBLISHED" || status === "Xuất bản") {
        label = "Xuất bản";
        bg = "var(--palette-info-lighter)";
        text = "var(--palette-info-dark)";
    } else if (status === "ARCHIVED") {
        label = "Lưu trữ";
        bg = "var(--palette-error-lighter)";
        text = "var(--palette-error-dark)";
    } else if (status === "DRAFT") {
        label = "Bản nháp";
        bg = "var(--palette-warning-lighter)";
        text = "var(--palette-warning-dark)";
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

export const RenderActionsCell = (params: GridRenderCellParams) => {
    const navigate = useNavigate();
    const { mutate: deleteBlog } = useDeleteBlog();
    const id = params.row.id;

    const handleEdit = () => {
        navigate(`/${prefixAdmin}/blog/edit/${id}`);
    };

    const handleDelete = () => {
        confirmDelete("Bạn có chắc chắn muốn xóa bài viết này?", () => {
            deleteBlog(id, {
                onSuccess: (res: any) => {
                    if (res.success) {
                        toast.success("Xóa bài viết thành công");
                    } else {
                        toast.error(res.message);
                    }
                }
            });
        });
    };

    return (
        <GridActionsCell {...params}>
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
                onClick={() => navigate(`/${prefixAdmin}/blog/detail/${id}`)}
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
            <GridActionsCellItem
                icon={<DeleteIcon />}
                label="Xóa"
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





