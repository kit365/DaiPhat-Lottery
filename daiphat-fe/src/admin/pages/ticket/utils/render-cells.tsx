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

// Vé số
export const RenderTicketCell = (params: GridRenderCellParams) => {
    const { providerName, serialNumber, numbers, image } = params.row;
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
                alt={providerName}
                src={image}
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
                        {providerName}
                    </Box>
                }
                secondary={`Sê-ri: ${serialNumber} - Dãy: ${numbers}`}
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

// Status
export const RenderStatusCell = (params: GridRenderCellParams) => {
    const { status, statusDisplayName } = params.row;

    let bg = "var(--palette-text-disabled)29";
    let text = "var(--palette-text-primary)";

    if (status === "in_stock") {
        bg = "var(--palette-info-lighter)";
        text = "var(--palette-info-dark)";
    } else if (status === "sold") {
        bg = "var(--palette-success-lighter)";
        text = "var(--palette-success-dark)";
    } else if (status === "expired" || status === "internal_fault" || status === "issuer_fault") {
        bg = "var(--palette-error-lighter)";
        text = "var(--palette-error-dark)";
    } else if (status === "reserved" || status === "proxy_holding" || status === "pending_return" || status === "returned") {
        bg = "rgba(255 171 0 / 24%)";
        text = "#FFAB00";
    }

    return (
        <span
            className="inline-flex items-center justify-center leading-1.5 min-w-[1.5rem] h-[1.5rem] text-[0.75rem] px-[6px] font-[700] rounded-[6px]"
            style={{
                backgroundColor: bg,
                color: text,
            }}
        >
            {statusDisplayName || status}
        </span>
    );
}

interface RenderActionsCellProps extends GridRenderCellParams {
    isTrash: boolean;
}

// Actions
export const RenderActionsCell = (params: RenderActionsCellProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { deleteTicket, restoreTicket, forceDeleteTicket } = useTickets();
    const { isTrash, ...paramsRest } = params;

    const handleEdit = () => {
        navigate(`/${prefixAdmin}/ticket/edit/${params.row.id}`);
    };

    const handleDelete = () => {
        const message = isTrash ? "Bạn có chắc chắn muốn xóa vĩnh viễn vé số này?" : "Bạn có chắc chắn muốn xóa vé số này?";
        const action = isTrash ? forceDeleteTicket : deleteTicket;

        confirmDelete(message, () => {
            action(params.row.id, {
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

    const handleRestore = () => {
        restoreTicket(params.row.id, {
            onSuccess: (res: any) => {
                if (res.success) {
                    toast.success("Khôi phục vé số thành công");
                } else {
                    toast.error(res.message || "Khôi phục vé số thất bại");
                }
            },
            onError: (err: any) => {
                toast.error(err.response?.data?.message || err.message || "Khôi phục vé số không thành công");
            }
        });
    };

    return (
        <GridActionsCell {...paramsRest}>
            {!isTrash ? (
                <>
                    <GridActionsCellItem
                        icon={<EyeIcon />}
                        label={t("admin.common.details")}
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
                </>
            ) : (
                <GridActionsCellItem
                    icon={<ReloadIcon />}
                    label="Khôi phục"
                    onClick={handleRestore}
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
                />
            )}

            <GridActionsCellItem
                icon={<DeleteIcon />}
                label={isTrash ? "Xóa vĩnh viễn" : t("admin.common.delete")}
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
