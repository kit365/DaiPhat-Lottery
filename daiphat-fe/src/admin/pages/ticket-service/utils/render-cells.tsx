import { Box, ListItemText, Chip, Avatar } from "@mui/material";
import { GridActionsCell, GridActionsCellItem, GridRenderCellParams } from "@mui/x-data-grid";
import { DeleteIcon, EditIcon, EyeIcon } from "../../../assets/icons/index";
import { COLORS } from "../configs/constants";
import { useDeleteTicketService } from "../hooks/useTicketService";
import { useNavigate } from "react-router-dom";
import { prefixAdmin } from "../../../constants/routes";
import { toast } from "react-toastify";
import { confirmDelete } from "../../../utils/swal";

export const RenderTitleCell = (params: GridRenderCellParams) => {
    const { name, _id, images } = params.row;
    const navigate = useNavigate();
    const thumbnail = images && images.length > 0 ? images[0] : "";

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
                alt={name}
                src={thumbnail}
                variant="rounded"
                sx={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "var(--shape-borderRadius-md)",
                    backgroundColor: 'var(--palette-background-neutral)'
                }}
            />

            <ListItemText
                primary={
                    <Box
                        onClick={() => navigate(`/${prefixAdmin}/ticketService/edit/${_id}`)}
                        className="ticket-title"
                        sx={{
                            color: COLORS.primary,
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            transition: 'color 0.2s',
                            cursor: 'pointer',
                            '&:hover': {
                                color: 'var(--palette-primary-main)',
                                textDecoration: 'underline'
                            }
                        }}
                    >
                        {name}
                    </Box>
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

export const RenderCategoryCell = (params: GridRenderCellParams) => {
    const category = params.row.categoryId;
    const categoryName = typeof category === 'object' ? category?.name : "Không xác định";

    return (
        <span style={{ fontSize: '0.8125rem', color: 'var(--palette-text-secondary)' }}>
            {categoryName}
        </span>
    );
}

export const RenderStatusCell = (params: GridRenderCellParams) => {
    const status = params.row.status;
    const label = status === 'active' ? "Hoạt động" : "Tạm dừng";
    const bg = status === 'active' ? "var(--palette-info-lighter)" : "var(--palette-error-lighter)";
    const text = status === 'active' ? "var(--palette-info-dark)" : "var(--palette-error-dark)";

    return (
        <span
            className="inline-flex items-center justify-center min-w-[1.5rem] h-[1.5rem] text-[0.75rem] px-[6px] font-[700] rounded-[6px]"
            style={{ backgroundColor: bg, color: text }}
        >
            {label}
        </span>
    );
}

export const RenderPricingCell = (params: GridRenderCellParams) => {
    const { pricingType, basePrice } = params.row;
    if (pricingType === 'fixed') {
        return (
            <span style={{ fontSize: '0.8125rem' }}>
                {basePrice?.toLocaleString('vi-VN')} VNĐ
            </span>
        );
    }
    return <Chip label="Theo cân nặng" size="small" variant="outlined" />;
}

export const RenderUserTicketTypesCell = (params: GridRenderCellParams) => {
    const userTicketTypes = params.row.userTicketTypes || [];
    return (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {userTicketTypes.map((type: string) => (
                <Chip key={type} label={type} size="small" variant="outlined" sx={{ fontSize: '0.6875rem' }} />
            ))}
        </Box>
    );
};

export const RenderActionsCell = (params: GridRenderCellParams) => {
    const navigate = useNavigate();
    const { mutate: deleteTicketService } = useDeleteTicketService();
    const _id = params.row._id;

    const handleDelete = () => {
        confirmDelete("Bạn có chắc chắn muốn xóa dịch vụ này?", () => {
            deleteTicketService(_id, {
                onSuccess: (res: any) => {
                    if (res.code === 200 || res.success) {
                        toast.success("Xóa dịch vụ thành công");
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
                onClick={() => navigate(`/${prefixAdmin}/ticketService/detail/${_id}`)}
            />
            <GridActionsCellItem
                icon={<EditIcon />}
                label="Chỉnh sửa"
                showInMenu
                onClick={() => navigate(`/${prefixAdmin}/ticketService/edit/${_id}`)}
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





