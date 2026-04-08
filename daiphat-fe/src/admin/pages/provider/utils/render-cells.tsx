import { Avatar, Box, Link, ListItemText } from "@mui/material";
import { GridActionsCell, GridActionsCellItem, GridRenderCellParams } from "@mui/x-data-grid";
import { DeleteIcon, EditIcon, EyeIcon } from "../../../assets/icons/index";
import { COLORS } from "../configs/constants";
import { useDeleteProvider, useRestoreProvider, useDeletePermanentProvider } from "../hooks/useProvider";
import { ReloadIcon } from "../../../assets/icons/index";
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

export const RenderTitleCell = (params: GridRenderCellParams) => {
    const { name, avatar, altImage } = params.row;
    const id = params.row._id || params.row.id;
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
                        href={`/${prefixAdmin}/provider/edit/${id}`}
                        className="ticket-title"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate(`/${prefixAdmin}/provider/edit/${id}`);
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

export const RenderActionsCell = (params: GridRenderCellParams) => {
    const navigate = useNavigate();
    const { mutate: deleteProvider } = useDeleteProvider();
    const { mutate: restoreProvider } = useRestoreProvider();
    const { mutate: forceDeleteProvider } = useDeletePermanentProvider();
    const id = params.row._id || params.row.id;
    const isTrash = params.row.deleted;

    const handleEdit = () => {
        navigate(`/${prefixAdmin}/provider/edit/${id}`);
    };

    const handleDelete = () => {
        confirmDelete("Bạn có chắc chắn muốn xóa nhà đài này?", () => {
            deleteProvider(id, {
                onSuccess: (res: any) => {
                    if (res.success) {
                        toast.success("Xóa nhà đài thành công");
                    } else {
                        toast.error(res.message || "Có lỗi xảy ra");
                    }
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || err.message || "Không thể xóa nhà đài");
                }
            });
        });
    };

    const handleRestore = () => {
        restoreProvider(id, {
            onSuccess: (res: any) => {
                if (res.success) {
                    toast.success("Khôi phục nhà đài thành công");
                } else {
                    toast.error(res.message || "Có lỗi xảy ra");
                }
            },
            onError: (err: any) => {
                toast.error(err.response?.data?.message || err.message || "Không thể khôi phục nhà đài");
            }
        });
    };

    const handleForceDelete = () => {
        confirmDelete("Bạn có chắc chắn muốn xóa vĩnh viễn nhà đài này?", () => {
            forceDeleteProvider(id, {
                onSuccess: (res: any) => {
                    if (res.success) {
                        toast.success("Xóa vĩnh viễn nhà đài thành công");
                    } else {
                        toast.error(res.message || "Có lỗi xảy ra");
                    }
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || err.message || "Không thể xóa vĩnh viễn nhà đài");
                }
            });
        });
    };

    if (isTrash) {
        return (
            <GridActionsCell {...params}>
                <GridActionsCellItem
                    icon={<ReloadIcon />}
                    label="Khôi phục"
                    showInMenu
                    {...({
                        sx: {
                            '& .MuiTypography-root': {
                                fontSize: '0.8125rem',
                                fontWeight: "600",
                                color: "var(--palette-success-main)"
                            },
                        },
                    } as any)}
                    onClick={handleRestore}
                />
                <GridActionsCellItem
                    icon={<DeleteIcon />}
                    label="Xóa vĩnh viễn"
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
                    onClick={handleForceDelete}
                />
            </GridActionsCell>
        );
    }

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
                onClick={() => navigate(`/${prefixAdmin}/provider/edit/${id}`)}
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
