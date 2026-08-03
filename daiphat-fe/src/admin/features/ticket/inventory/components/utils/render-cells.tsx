"use client";

import type { ReactElement } from 'react';
import { Avatar, Box, Chip, Link, ListItemText } from '@mui/material';
import { GridActionsCell, GridActionsCellItem, GridRenderCellParams } from '@mui/x-data-grid';
import { DeleteIcon, EditIcon, EyeIcon } from '../../../../../assets/icons/index';
import { useNavigate } from '@/components/router-compat';
import { prefixAdmin } from '../../../../../constants/routes';
import { useTicketInventory } from '../../hooks/useTicketInventory';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { confirmDelete } from '../../../../../utils/swal';
import { useStations } from '../../../../station/hooks/useStation';
import { formatImportBatchCode } from '../../../import-batch/utils/importBatchCode';
import { getTicketStatusLabel, normalizeTicketStatus } from '../../constants/ticket-status.config';

dayjs.locale('vi');

interface RenderCreatedAtCellProps {
    value: Date | null | any;
}

export const RenderTicketCell = (params: GridRenderCellParams) => {
    const { stationName, numbers, avatar, ticketImg, batchCode, quantity } = params.row;
    const navigate = useNavigate();
    const id = params.row.id || params.row._id;

    const displayImage = avatar || ticketImg;
    const displayName = stationName || params.row.providerName || 'Không xác định';

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                py: 'calc(2 * var(--spacing))',
                gap: 'calc(2 * var(--spacing))',
                width: '100%',
            }}
        >
            <Avatar
                alt={displayName}
                src={displayImage}
                variant="rounded"
                sx={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--shape-borderRadius-md)',
                    backgroundColor: 'var(--palette-background-neutral)',
                }}
            />

            <ListItemText
                primary={
                    <Link
                        href={`/${prefixAdmin}/ticket/edit/${id}`}
                        className="admin-cell-title"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate(`/${prefixAdmin}/ticket/edit/${id}`);
                        }}
                        underline="hover"
                        sx={{ 
                            fontSize: '1.15rem', 
                            letterSpacing: '0.05em', 
                            color: 'primary.main',
                            fontWeight: 700 
                        }}
                    >
                        {numbers || 'N/A'}
                    </Link>
                }
                secondary={
                    <span className="admin-cell-subtitle" style={{ fontSize: '0.85rem' }}>
                        Số lượng: <strong style={{ color: 'var(--palette-error-main)', fontSize: '0.95rem' }}>{quantity ?? 0}</strong>
                    </span>
                }
                slotProps={{
                    primary: {
                        component: 'span',
                        variant: 'body1',
                        noWrap: true,
                    },
                    secondary: {
                        component: 'span',
                    },
                }}
                sx={{ m: 0 }}
            />
        </Box>
    );
};

export const RenderCreatedAtCell = ({ value }: RenderCreatedAtCellProps) => {
    if (!value) return null;
    const dateObj = dayjs(value);
    if (!dateObj.isValid()) return null;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="admin-cell-date">{dateObj.format('DD MMM, YYYY')}</span>
            <span className="admin-cell-date-secondary">{dateObj.format('hh:mm A')}</span>
        </Box>
    );
};

const DrawDateCell = (params: GridRenderCellParams) => {
    const { data: stationsData } = useStations({ limit: 1000 });
    const date = params.value;
    if (!date) return null;
    const stations = stationsData?.data?.recordList || [];
    const stationId = params.row.stationId || params.row.providerId;
    const station = stations.find((p: any) => (p.id || p._id)?.toString() === stationId?.toString());
    const drawTime = station?.drawTime || '--:--';
    const dateObj = dayjs(date);
    if (!dateObj.isValid()) return null;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="admin-cell-date">{dateObj.format('DD MMM, YYYY')}</span>
            <span className="admin-cell-date-secondary">{drawTime}</span>
        </Box>
    );
};

export const RenderDrawDateCell = (params: GridRenderCellParams) => {
    return <DrawDateCell {...params} />;
};

const ticketStatusModifier = (status?: string | null): string => {
    const normalized = normalizeTicketStatus(status);
    switch (normalized) {
        case 'IN_STOCK':
            return 'admin-status-badge--active';
        case 'IMPORTING':
            return 'admin-status-badge--pending';
        case 'SOLD_OUT':
        case 'EXPIRED':
            return 'admin-status-badge--inactive';
        default:
            // Unknown / legacy cached values
            return 'admin-status-badge--draft';
    }
};

export const RenderStatusCell = (params: GridRenderCellParams) => {
    const { status, statusDisplayName } = params.row;
    const label = statusDisplayName || getTicketStatusLabel(status) || status || '—';
    const modifier = ticketStatusModifier(status);

    return <span className={`admin-status-badge ${modifier}`.trim()}>{label}</span>;
};

const ticketConditionModifier = (condition?: string | null): string => {
    const normalized = (condition || '').toUpperCase();
    if (normalized === 'DAMAGED' || normalized === 'LOST' || normalized === 'VOIDED') {
        return 'admin-status-badge--inactive';
    }
    return 'admin-status-badge--active';
};

export const RenderTicketConditionCell = (params: GridRenderCellParams) => {
    const { ticketCondition, ticketConditionDisplayName } = params.row;
    const condition = (ticketCondition || '').toUpperCase();

    const label =
        ticketConditionDisplayName ||
        (condition === 'DAMAGED'
            ? 'Hỏng vật lý'
            : condition === 'LOST'
              ? 'Thất lạc'
              : condition === 'VOIDED'
                ? 'Đã hủy'
                : 'Tốt');

    const modifier = ticketConditionModifier(ticketCondition);

    return <span className={`admin-status-badge ${modifier}`.trim()}>{label}</span>;
};

export const RenderActionsCell = (params: GridRenderCellParams) => {
    const navigate = useNavigate();
    const { deleteTicket } = useTicketInventory();
    const id = params.row.id || params.row._id;

    const handleEdit = () => {
        navigate(`/${prefixAdmin}/ticket/edit/${id}`);
    };

    const handleDelete = () => {
        confirmDelete('Bạn có chắc chắn muốn xóa vé số này?', () => {
            deleteTicket(id, {
                onSuccess: (res: any) => {
                    if (res.success) {
                        toast.success(res.message || 'Thao tác thành công');
                    } else {
                        toast.error(res.message || 'Thao tác thất bại');
                    }
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || err.message || 'Thao tác không thành công');
                },
            });
        });
    };

    const items: ReactElement[] = [
        <GridActionsCellItem
            key="view"
            className="admin-menu-item"
            icon={<EyeIcon />}
            label="Chi tiết"
            onClick={() => navigate(`/${prefixAdmin}/ticket/detail/${id}`)}
            showInMenu
        />,
        <GridActionsCellItem
            key="edit"
            className="admin-menu-item"
            icon={<EditIcon />}
            label="Chỉnh sửa"
            onClick={handleEdit}
            showInMenu
        />,
        <GridActionsCellItem
            key="delete"
            className="admin-menu-item admin-menu-item--danger"
            icon={<DeleteIcon />}
            label="Xóa"
            onClick={handleDelete}
            showInMenu
        />,
    ];

    return <GridActionsCell {...params}>{items}</GridActionsCell>;
};
