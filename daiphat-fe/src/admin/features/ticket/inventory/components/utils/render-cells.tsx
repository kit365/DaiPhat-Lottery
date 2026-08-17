"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { Box, Link, Typography, Stack } from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { prefixAdmin } from '../../../../../constants/routes';
import { useTicketInventory } from '../../hooks/useTicketInventory';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { confirmDelete } from '../../../../../utils/swal';
import { useStations } from '../../../../station/hooks/useStation';
import { formatImportBatchCode } from '../../../import-batch/utils/importBatchCode';
import { getTicketStatusLabel, normalizeTicketStatus } from '../../constants/ticket-status.config';
import { AdminRowActionsMenu } from '../../../../../components/ui/AdminRowActionsMenu';
import { AdminStatusBadge } from '../../../../../components/ui/AdminStatusBadge';
import { AdminLuckyDisplay } from '@/shared/lucky-number';

dayjs.locale('vi');

interface RenderCreatedAtCellProps {
    value: Date | null | any;
}

export const RenderTicketCell = (params: GridRenderCellParams) => {
    const { numbers, quantity } = params.row;
    const router = useAdminRouter();
    const id = params.row.id || params.row._id;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, py: 0.75 }}>
            <Link
                href={`/${prefixAdmin}/ticket/detail/${id}`}
                onClick={(e) => {
                    e.preventDefault();
                    router.push(`/${prefixAdmin}/ticket/detail/${id}`);
                }}
                underline="hover"
                sx={{ 
                    fontSize: '1.05rem', 
                    letterSpacing: '0.06em', 
                    color: '#0f172a',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    lineHeight: 1.2,
                    '&:hover': { color: '#2563eb' },
                }}
            >
                <AdminLuckyDisplay
                    value={numbers}
                    ticket
                    sx={{
                        fontSize: '1.05rem',
                        letterSpacing: '0.06em',
                        color: 'inherit',
                        fontWeight: 800,
                        lineHeight: 1.2,
                    }}
                />
            </Link>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                Số lượng: <Box component="span" sx={{ color: '#ea580c', fontWeight: 800 }}>{quantity ?? 0}</Box> vé
            </Typography>
        </Box>
    );
};

export const RenderCreatedAtCell = ({ value }: RenderCreatedAtCellProps) => {
    if (!value) return null;
    const dateObj = dayjs(value);
    if (!dateObj.isValid()) return null;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <Typography variant="body2" fontWeight={600} color="#0f172a" sx={{ fontSize: '0.8125rem' }}>
                {dateObj.format('DD/MM/YYYY')}
            </Typography>
            <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.75rem' }}>
                {dateObj.format('HH:mm')}
            </Typography>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <Typography variant="body2" fontWeight={600} color="#0f172a" sx={{ fontSize: '0.8125rem' }}>
                {dateObj.format('DD/MM/YYYY')}
            </Typography>
            <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.75rem' }}>
                {drawTime}
            </Typography>
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
            return 'admin-status-badge--draft';
    }
};

export const RenderStatusCell = (params: GridRenderCellParams) => {
    const { status, statusDisplayName } = params.row;
    const label = statusDisplayName || getTicketStatusLabel(status) || status || '—';
    const modifier = ticketStatusModifier(status);

    return <AdminStatusBadge label={label} modifier={modifier} />;
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
            ? 'Hỏng'
            : condition === 'LOST'
              ? 'Thất lạc'
              : condition === 'VOIDED'
                ? 'Đã hủy'
                : 'Tốt');

    const modifier = ticketConditionModifier(ticketCondition);

    return <AdminStatusBadge label={label} modifier={modifier} />;
};

export const RenderActionsCell = (params: GridRenderCellParams) => {
    const router = useAdminRouter();
    const { deleteTicket } = useTicketInventory();
    const id = params.row.id || params.row._id;

    const handleEdit = () => {
        router.push(`/${prefixAdmin}/ticket/edit/${id}`);
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

    return (
        <AdminRowActionsMenu
            items={[
                {
                    id: 'view',
                    label: 'Chi tiết',
                    icon: 'view',
                    onClick: () => router.push(`/${prefixAdmin}/ticket/detail/${id}`),
                },
                {
                    id: 'edit',
                    label: 'Chỉnh sửa',
                    icon: 'edit',
                    onClick: handleEdit,
                },
                {
                    id: 'delete',
                    label: 'Xóa',
                    icon: 'delete',
                    onClick: handleDelete,
                    danger: true,
                },
            ]}
        />
    );
};
