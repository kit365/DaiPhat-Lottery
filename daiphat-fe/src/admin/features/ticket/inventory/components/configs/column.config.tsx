import { GridColDef } from '@mui/x-data-grid';
import { formatImportBatchCode, displayImportBatchLineCodeRaw } from '../../../import-batch/utils/importBatchCode';
import { ITicket } from '../../types/ticket.type';
import {
    RenderActionsCell,
    RenderTicketCell,
    RenderStatusCell,
    RenderTicketConditionCell,
    RenderCreatedAtCell,
    RenderDrawDateCell,
} from '../utils/render-cells';
import { getStationColor } from '../../../../station/utils/stationColor';
import { Box, Typography } from '@mui/material';

export const columnsConfig: GridColDef<ITicket>[] = [
    {
        field: 'ticket',
        headerName: 'Vé số',
        flex: 1.2,
        minWidth: 150,
        hideable: false,
        filterable: true,
        renderCell: RenderTicketCell,
    },
    {
        field: 'stationName',
        headerName: 'Nhà đài',
        width: 170,
        filterable: true,
        valueGetter: (value, row) => (row as any).stationName || (row as any).providerName || 'Không xác định',
        renderCell: (params) => {
            const stationId = (params.row as any).stationId || (params.row as any).providerId;
            const color = getStationColor(stationId);
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                        sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: color,
                            flexShrink: 0,
                        }}
                    />
                    <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ color: color || '#0f172a', fontSize: '0.85rem' }}
                        noWrap
                        title={String(params.value ?? '')}
                    >
                        {params.value as string}
                    </Typography>
                </Box>
            );
        },
    },
    {
        field: 'batchCode',
        headerName: 'Lô nhập',
        width: 240,
        filterable: true,
        renderCell: (params) => {
            const raw = String(params.value ?? '');
            if (!raw) return '—';
            return (
                <Box
                    component="span"
                    sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.775rem',
                        fontWeight: 700,
                        bgcolor: '#f1f5f9',
                        color: '#334155',
                        px: 1,
                        py: 0.35,
                        borderRadius: '6px',
                        display: 'inline-block',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                    title={raw}
                >
                    {displayImportBatchLineCodeRaw(raw)}
                </Box>
            );
        },
    },
    {
        field: 'drawDate',
        headerName: 'Ngày quay',
        width: 140,
        filterable: true,
        renderCell: (params) => <RenderDrawDateCell {...params} />,
    },
    {
        field: 'createdAt',
        headerName: 'Nhập lúc',
        width: 150,
        filterable: true,
        type: 'date',
        valueGetter: (value) => (value ? new Date(value) : null),
        renderCell: (params) => <RenderCreatedAtCell value={params.value} />,
    },
    {
        field: 'status',
        headerName: 'Trạng thái',
        width: 110,
        minWidth: 100,
        align: 'center',
        headerAlign: 'center',
        filterable: false,
        renderCell: RenderStatusCell,
    },
    {
        field: 'ticketCondition',
        headerName: 'Tình trạng vé',
        width: 110,
        minWidth: 100,
        align: 'center',
        headerAlign: 'center',
        filterable: false,
        renderCell: RenderTicketConditionCell,
    },
    {
        field: 'actions',
        headerName: '',
        sortable: false,
        filterable: false,
        hideable: false,
        disableColumnMenu: true,
        width: 60,
        align: 'center',
        headerAlign: 'center',
        renderCell: RenderActionsCell,
    },
];

export const columnsInitialState = {};
