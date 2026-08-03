"use client";

import type { ReactElement } from "react";
import { Avatar, Box, Link, ListItemText, IconButton, CircularProgress } from "@mui/material";
import { GridActionsCell, GridActionsCellItem, GridRenderCellParams } from "@mui/x-data-grid";
import { DeleteIcon, EditIcon, EyeIcon } from "../../../../assets/icons/index";
import { useDeleteStation, useUploadStationImage } from "../../hooks/useStation";
import { Camera } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { useNavigate } from "react-router-dom";
import { prefixAdmin } from "../../../../constants/routes";
import { toast } from "react-toastify";
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { confirmDelete } from "../../../../utils/swal";
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { PERMISSIONS } from '../../../../constants/permission.constants';

dayjs.locale('vi');
interface RenderCreatedAtCellProps {
    value: Date | null | any;
}

export const RenderTitleCell = (params: GridRenderCellParams) => {
    const { name, avatar, image, thumbnailUrl, altImage } = params.row;
    const finalAvatar = avatar || thumbnailUrl || image;
    const id = params.row._id || params.row.id;
    const navigate = useNavigate();

    const { mutateAsync: uploadImage, isPending } = useUploadStationImage();
    const queryClient = useQueryClient();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const res: any = await uploadImage({ id, file });
            if (res.success || res) {
                toast.success("Cập nhật ảnh thành công");
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STATIONS] });
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
            }}
        >
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
                        className="admin-avatar-upload-btn"
                    >
                        {isPending ? <CircularProgress size={22} /> : <Camera size={22} />}
                    </IconButton>
                </label>
            </Box>

            <ListItemText
                primary={
                    <Link
                        href={`/${prefixAdmin}/provider/edit/${id}`}
                        className="admin-cell-title"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate(`/${prefixAdmin}/provider/edit/${id}`);
                        }}
                        underline="hover"
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="admin-cell-date">{formattedDate}</span>
            <span className="admin-cell-date-secondary">{formattedTime}</span>
        </Box>
    );
}

export const RenderStatusCell = (params: GridRenderCellParams) => {
    const status = params.row.status?.toLowerCase();

    let label = "Không xác định";
    let modifier = "";

    switch (status) {
        case 'draft':
            label = "Bản nháp";
            modifier = "admin-status-badge--draft";
            break;
        case 'pending_approval':
            label = "Chờ duyệt";
            modifier = "admin-status-badge--pending";
            break;
        case 'active':
            label = "Đang hoạt động";
            modifier = "admin-status-badge--active";
            break;
        case 'inactive':
            label = "Ngừng hoạt động";
            modifier = "admin-status-badge--inactive";
            break;
    }

    return (
        <span className={`admin-status-badge ${modifier}`.trim()}>
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
    const { mutate: deleteStation } = useDeleteStation();
    const id = params.row._id || params.row.id;

    const handleEdit = () => {
        navigate(`/${prefixAdmin}/provider/edit/${id}`);
    };

    const handleDelete = () => {
        confirmDelete("Bạn có chắc chắn muốn xóa nhà đài này?", () => {
            deleteStation(id, {
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

    const items: ReactElement[] = [];

    if (canView) {
        items.push(
            <GridActionsCellItem
                key="view"
                className="admin-menu-item"
                icon={<EyeIcon />}
                label="Chi tiết"
                showInMenu
                onClick={() => navigate(`/${prefixAdmin}/provider/detail/${id}`)}
            />
        );
    }

    if (canEdit) {
        items.push(
            <GridActionsCellItem
                key="edit"
                className="admin-menu-item"
                icon={<EditIcon />}
                label="Chỉnh sửa"
                showInMenu
                onClick={handleEdit}
            />
        );
    }

    if (canDelete) {
        items.push(
            <GridActionsCellItem
                key="delete"
                className="admin-menu-item admin-menu-item--danger"
                icon={<DeleteIcon />}
                label="Xóa"
                showInMenu
                onClick={handleDelete}
            />
        );
    }

    return <GridActionsCell {...params}>{items}</GridActionsCell>;
}
