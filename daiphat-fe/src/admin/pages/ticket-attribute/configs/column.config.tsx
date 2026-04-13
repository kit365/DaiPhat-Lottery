
import { Box, Link } from "@mui/material";
import { GridActionsCell, GridActionsCellItem, GridRenderCellParams, GridColDef } from "@mui/x-data-grid";
import { DeleteIcon, EditIcon, ReloadIcon, EyeIcon } from "../../../assets/icons/index";
import { COLORS, ATTRIBUTE_TYPES } from "./constants";
import { useDeleteTicketAttribute, useRestoreTicketAttribute, useForceDeleteTicketAttribute } from "../hooks/useTicketAttribute";
import { useNavigate } from "react-router-dom";
import { prefixAdmin } from "../../../constants/routes";
import { toast } from "react-toastify";
import Chip from '@mui/material/Chip';
import { useMemo } from "react";


// Render Tên thuộc tính
export const RenderNameCell = (params: GridRenderCellParams) => {
    const { name, _id } = params.row;
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
            <Link
                href={`/${prefixAdmin}/ticket/attribute/edit/${_id}`}
                className="attribute-name"
                onClick={(e) => {
                    e.preventDefault();
                    navigate(`/${prefixAdmin}/ticket/attribute/edit/${_id}`);
                }}
                underline="hover"
                sx={{
                    color: COLORS.primary,
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    transition: 'color 0.2s',
                }}
            >
                {name}
            </Link>
        </Box>
    );
};

// Render Loại hiển thị - Simple text
export const RenderTypeCell = (params: GridRenderCellParams) => {
    const type = params.value;
    const typeOption = ATTRIBUTE_TYPES.find(t => t.value === type);

    return (
        <span
            style={{
                fontSize: '0.875rem',
                color: 'var(--palette-text-secondary)',
            }}
        >
            {typeOption ? typeOption.label : type}
        </span>
    );
};

// Render Giá trị (options) - Unified blue color
export const RenderOptionsCell = (params: GridRenderCellParams) => {
    const options = params.value || [];

    return (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', py: 1 }}>
            {options.slice(0, 5).map((v: any, index: number) => (
                <Chip
                    key={index}
                    label={`${v.label}`}
                    size="small"
                    sx={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        height: '24px',
                        borderRadius: "var(--shape-borderRadius-sm)",
                        background: '#00B8D929',
                        color: '#006C9C',
                        border: 'none'
                    }}
                />
            ))}
            {options.length > 5 && (
                <Chip
                    label={`+${options.length - 5}`}
                    size="small"
                    sx={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        height: '24px',
                        borderRadius: "var(--shape-borderRadius-sm)",
                        background: '#00B8D929',
                        color: '#006C9C',
                    }}
                />
            )}
        </Box>
    );
};

// Actions
export const RenderActionsCell = (params: GridRenderCellParams & { isTrash?: boolean }) => {
    const navigate = useNavigate();
    const { mutate: deleteAttribute } = useDeleteTicketAttribute();
    const { mutate: restoreAttribute } = useRestoreTicketAttribute();
    const { mutate: forceDeleteAttribute } = useForceDeleteTicketAttribute();

    const id = params.row._id;
    const isTrash = params.isTrash;

    const handleEdit = () => {
        navigate(`/${prefixAdmin}/ticket/attribute/edit/${id}`);
    };

    const handleDetail = () => {
        navigate(`/${prefixAdmin}/ticket/attribute/detail/${id}`);
    };

    const handleDelete = () => {
        if (window.confirm("Bạn có chắc chắn muốn xóa thuộc tính này?")) {
            deleteAttribute(id, {
                onSuccess: (res: any) => {
                    if (res.success) {
                        toast.success("Xóa thuộc tính thành công");
                    } else {
                        toast.error(res.message);
                    }
                }
            });
        }
    };

    const handleRestore = () => {
        restoreAttribute(id, {
            onSuccess: (res: any) => {
                if (res.success) {
                    toast.success("Khôi phục thuộc tính thành công");
                } else {
                    toast.error(res.message);
                }
            }
        });
    };

    const handleForceDelete = () => {
        if (window.confirm("Xóa vĩnh viễn? Hành động này không thể hoàn tác!")) {
            forceDeleteAttribute(id, {
                onSuccess: (res: any) => {
                    if (res.success) {
                        toast.success("Đã xóa vĩnh viễn thuộc tính");
                    } else {
                        toast.error(res.message);
                    }
                }
            });
        }
    };

    if (isTrash) {
        return (
            <GridActionsCell {...params}>
                <GridActionsCellItem
                    icon={<ReloadIcon />}
                    label="Khôi phục"
                    showInMenu
                    onClick={handleRestore}
                />
                <GridActionsCellItem
                    icon={<DeleteIcon />}
                    label="Xóa vĩnh viễn"
                    showInMenu
                    {...({
                        sx: {
                            '& .MuiTypography-root': {
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
                label="Xem chi tiết"
                showInMenu
                onClick={handleDetail}
            />
            <GridActionsCellItem
                icon={<EditIcon />}
                label="Chỉnh sửa"
                showInMenu
                onClick={handleEdit}
            />
            <GridActionsCellItem
                icon={<DeleteIcon />}
                label="Xóa"
                showInMenu
                {...({
                    sx: {
                        '& .MuiTypography-root': {
                            color: "var(--palette-error-main)"
                        },
                    },
                } as any)}
                onClick={handleDelete}
            />
        </GridActionsCell>
    );
};

// Hook for columns
export const useAttributeColumns = (isTrash: boolean) => {
    return useMemo(() => {
        const columns: GridColDef<any>[] = [
            {
                field: "name",
                headerName: "Tên thuộc tính",
                flex: 1,
                minWidth: 180,
                hideable: false,
                renderCell: RenderNameCell,
            },
            {
                field: "type",
                headerName: "Kiểu hiển thị",
                width: 150,
                renderCell: RenderTypeCell,
            },
            {
                field: "options",
                headerName: "Danh sách lựa chọn",
                flex: 2,
                minWidth: 350,
                renderCell: RenderOptionsCell,
            },
            {
                field: 'actions',
                headerName: 'Hành động',
                width: 100,
                sortable: false,
                filterable: false,
                align: 'center',
                headerAlign: 'center',
                renderCell: (params) => <RenderActionsCell {...params} isTrash={isTrash} />,
            },
        ];
        return columns;
    }, [isTrash]);
};

export const columnsInitialState = {
    pagination: {
        paginationModel: { page: 0, pageSize: 10 },
    },
};
