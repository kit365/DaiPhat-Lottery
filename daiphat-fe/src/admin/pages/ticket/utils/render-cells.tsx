import { Avatar, Box, LinearProgress, ListItemText } from "@mui/material";
import { GridActionsCell, GridActionsCellItem, GridRenderCellParams } from "@mui/x-data-grid";
import { DeleteIcon, EditIcon, EyeIcon } from "../../../assets/icons/index";
import { COLORS } from "../configs/constants";
import { useNavigate } from "react-router-dom";
import { prefixAdmin } from "../../../constants/routes";
import { useTickets } from "../hooks/useTickets";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { confirmDelete } from "../../../utils/swal";
import { ReloadIcon } from "../../../assets/icons/index";
import { useProviders } from "../../provider/hooks/useProvider";

// Vé số
export const RenderTicketCell = (params: GridRenderCellParams) => {
    const { stationName, numbers, avatar, ticketImg, batchCode, quantity } = params.row;
    const navigate = useNavigate();

    const displayImage = avatar || ticketImg;
    const displayName = stationName || params.row.providerName || "Không xác định";

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
                alt={displayName}
                src={displayImage}
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
                    <Box
                        onClick={() => navigate(`/${prefixAdmin}/ticket/edit/${params.row.id}`)}
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
                        {displayName}
                    </Box>
                }
                secondary={`Mã lô: ${batchCode || 'N/A'} - Dãy số: ${numbers || 'N/A'} - SL: ${quantity ?? 0}`}
                slotProps={{
                    primary: {
                        component: 'span',
                        variant: 'body1',
                        noWrap: true,
                    },
                    secondary: {
                        component: 'span',
                        variant: 'body2',
                        sx: { color: 'var(--palette-text-disabled)', fontSize: "0.8125rem" }
                    }
                }}
                sx={{ m: 0 }}
            />
        </Box>
    );
}

// Thời gian tạo
export const RenderCreatedAtCell = (params: GridRenderCellParams) => {
    const date = params.value;
    if (!date) return null;

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
                }}>
                {dayjs(date).format('DD/MM/YYYY')}
            </span>

            <Box
                className="date-text"
                component='span'
                sx={{
                    fontSize: "0.75rem",
                    color: COLORS.secondary
                }}
            >
                {dayjs(date).format('HH:mm')}
            </Box>
        </Box >
    );
}

const DrawDateCell = (params: GridRenderCellParams) => {
    const date = params.value;
    if (!date) return null;

    const { data: providersData } = useProviders({ size: 1000 });
    const providers = providersData?.data?.recordList || [];
    const stationId = params.row.stationId || params.row.providerId;
    const provider = providers.find((p: any) => (p.id || p._id)?.toString() === stationId?.toString());
    const drawTime = provider?.drawTime || '--:--';

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
                }}>
                {dayjs(date).format('DD/MM/YYYY')}
            </span>

            <Box
                className="date-text"
                component='span'
                sx={{
                    fontSize: "0.75rem",
                    color: COLORS.secondary
                }}
            >
                {drawTime}
            </Box>
        </Box >
    );
};

// Ngày quay
export const RenderDrawDateCell = (params: GridRenderCellParams) => {
    return <DrawDateCell {...params} />;
}

// Status
export const RenderStatusCell = (params: GridRenderCellParams) => {
    const { status, statusDisplayName } = params.row;

    let bg = "var(--palette-text-disabled)29";
    let text = "var(--palette-text-primary)";
    let label = statusDisplayName;

    if (status === "in_stock") {
        bg = "var(--palette-info-lighter)";
        text = "var(--palette-info-dark)";
        if (!label) label = "Trong kho";
    } else if (status === "sold") {
        bg = "var(--palette-success-lighter)";
        text = "var(--palette-success-dark)";
        if (!label) label = "Đã bán";
    } else if (status === "expired") {
        bg = "var(--palette-error-lighter)";
        text = "var(--palette-error-dark)";
        if (!label) label = "Hết hạn";
    } else if (status === "internal_fault" || status === "issuer_fault") {
        bg = "var(--palette-error-lighter)";
        text = "var(--palette-error-dark)";
        if (!label) label = "Lỗi / Hỏng";
    } else if (status === "reserved" || status === "proxy_holding" || status === "pending_return" || status === "returned") {
        bg = "rgba(255 171 0 / 24%)";
        text = "#FFAB00";
        if (!label && status === "reserved") label = "Đã đặt trước";
        if (!label && status === "proxy_holding") label = "Đại lý giữ";
    }

    if (!label) label = status;

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
export const RenderActionsCell = (params: GridRenderCellParams) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { deleteTicket } = useTickets();

    const handleEdit = () => {
        navigate(`/${prefixAdmin}/ticket/edit/${params.row.id}`);
    };

    const handleDelete = () => {
        confirmDelete("Bạn có chắc chắn muốn xóa vé số này?", () => {
            deleteTicket(params.row.id, {
                onSuccess: (res: any) => {
                    if (res.success) {
                        toast.success(res.message || "Thao tác thành công");
                    } else {
                        toast.error(res.message || "Thao tác thất bại");
                    }
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || err.message || "Thao tác không thành công");
                }
            });
        });
    };

    return (
        <GridActionsCell {...params}>
            <GridActionsCellItem
                icon={<EyeIcon />}
                label={t("admin.common.details")}
                onClick={() => navigate(`/${prefixAdmin}/ticket/detail/${params.row.id}`)}
                showInMenu
                {...({
                    sx: {
                        '& .MuiTypography-root': {
                            fontSize: '0.8125rem',
                            fontWeight: "600"
                        },
                    },
                } as any)}
            />
            <GridActionsCellItem
                icon={<EditIcon />}
                label={t("admin.common.edit")}
                onClick={handleEdit}
                showInMenu
                {...({
                    sx: {
                        '& .MuiTypography-root': {
                            fontSize: '0.8125rem',
                            fontWeight: "600"
                        },
                    },
                } as any)}
            />

            <GridActionsCellItem
                icon={<DeleteIcon />}
                label={t("admin.common.delete")}
                onClick={handleDelete}
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
            />
        </GridActionsCell>
    );
}
