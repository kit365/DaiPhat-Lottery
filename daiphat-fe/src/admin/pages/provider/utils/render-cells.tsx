import { Avatar, Box, Link, ListItemText, IconButton, CircularProgress } from "@mui/material";
import { GridActionsCell, GridActionsCellItem, GridRenderCellParams } from "@mui/x-data-grid";
import { DeleteIcon, EditIcon, EyeIcon } from "../../../assets/icons/index";
import { COLORS } from "../configs/constants";
import { useDeleteProvider, useUploadProviderImage } from "../hooks/useProvider";
import { Camera } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../../constants/queryKeys';
import { ReloadIcon } from "../../../assets/icons/index";
import { useNavigate } from "react-router-dom";
import { prefixAdmin } from "../../../constants/routes";
import { toast } from "react-toastify";
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { confirmDelete } from "../../../utils/swal";
import { useAuthStore } from '../../../../stores/useAuthStore';
import { PERMISSIONS } from '../../../constants/permission.constants';

dayjs.locale('vi');
interface RenderCreatedAtCellProps {
    value: Date | null | any;
}

export const RenderTitleCell = (params: GridRenderCellParams) => {
    const { name, avatar, image, thumbnailUrl, altImage } = params.row;
    const finalAvatar = avatar || thumbnailUrl || image;
    const id = params.row._id || params.row.id;
    const navigate = useNavigate();
    
    const { mutateAsync: uploadImage, isPending } = useUploadProviderImage();
    const queryClient = useQueryClient();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const res: any = await uploadImage({ id, file });
            if (res.success || res) {
                toast.success("Cập nhật ảnh thành công");
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROVIDERS] });
            } else {
                toast.error(res.message || "Cập nhật ảnh thất bại");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message || "Cập nhật ảnh thất bại");
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                py: "calc(2 * var(--spacing))",
                gap: "calc(2 * var(--spacing))",
                width: "100%",
            }}>

            <Box sx={{ position: 'relative' }}>
                <Avatar
                    alt={altImage || name}
                    src={finalAvatar}
                    variant="rounded"
                    sx={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "var(--shape-borderRadius-md)",
                        backgroundColor: 'var(--palette-background-neutral)'
                    }}
                />
                <input
                    type="file"
                    id={`upload-avatar-${id}`}
                    hidden
                    accept="image/*"
                    onChange={handleFileChange}
                />
                <label htmlFor={`upload-avatar-${id}`}>
                    <IconButton
                        component="span"
                        disabled={isPending}
                        sx={{
                            position: 'absolute',
                            bottom: -10,
                            right: -10,
                            color: '#637381',
                            '&:hover': { color: 'var(--palette-primary-main)' }
                        }}
                    >
                        {isPending ? <CircularProgress size={22} /> : <Camera size={22} />}
                    </IconButton>
                </label>
            </Box>

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
    const status = params.row.status?.toLowerCase();

    let label = "Không xác định";
    let bg = "var(--palette-grey-200)";
    let text = "var(--palette-grey-800)";

    switch (status) {
        case 'draft':
            label = "Bản nháp";
            bg = "#e5e7eb";
            text = "#374151";
            break;
        case 'pending_approval':
            label = "Chờ duyệt";
            bg = "var(--palette-warning-lighter)";
            text = "var(--palette-warning-dark)";
            break;
        case 'active':
            label = "Đang hoạt động";
            bg = "var(--palette-info-lighter)";
            text = "var(--palette-info-dark)";
            break;
        case 'inactive':
            label = "Ngừng hoạt động";
            bg = "var(--palette-error-lighter)";
            text = "var(--palette-error-dark)";
            break;
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
    const { user } = useAuthStore();
    const roleCode = typeof user?.role === 'string' ? user.role : (user?.role?.code || '');
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'SUPER_ADMIN';
    const canView = isAdmin || Boolean(user?.permissions?.includes(PERMISSIONS.PROVIDER.VIEW));
    const canEdit = isAdmin || Boolean(user?.permissions?.includes(PERMISSIONS.PROVIDER.EDIT));
    const canDelete = isAdmin || Boolean(user?.permissions?.includes(PERMISSIONS.PROVIDER.DELETE));
    const { mutate: deleteProvider } = useDeleteProvider();
    const id = params.row._id || params.row.id;

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



    const items = [];

    if (canView) {
        items.push(
            <GridActionsCellItem
                key="view"
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
                onClick={() => navigate(`/${prefixAdmin}/provider/detail/${id}`)}
            />
        );
    }

    if (canEdit) {
        items.push(
            <GridActionsCellItem
                key="edit"
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
        );
    }

    if (canDelete) {
        items.push(
            <GridActionsCellItem
                key="delete"
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
        );
    }

    return <GridActionsCell {...params}>{items}</GridActionsCell>;
}
