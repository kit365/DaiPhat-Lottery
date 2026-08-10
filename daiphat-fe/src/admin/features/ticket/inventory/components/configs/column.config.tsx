import { GridColDef } from '@mui/x-data-grid';
import { formatImportBatchCode } from '../../../import-batch/utils/importBatchCode';
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

export const columnsConfig: GridColDef<ITicket>[] = [
    {
        field: 'ticket',
        headerName: 'Vé số',
        flex: 1,
        hideable: false,
        filterable: true,
        renderCell: RenderTicketCell,
    },
    {
        field: 'stationName',
        headerName: 'Nhà đài',
        width: 150,
        filterable: true,
        valueGetter: (value, row) => (row as any).stationName || (row as any).providerName || 'Không xác định',
        renderCell: (params) => {
            const stationId = (params.row as any).stationId || (params.row as any).providerId;
            const color = getStationColor(stationId);
            return (
                <span 
                    className="admin-cell-text" 
                    title={String(params.value ?? '')}
                    style={{ color, fontWeight: 600 }}
                >
                    {params.value as string}
                </span>
            );
        },
    },
    {
        field: 'batchCode',
        headerName: 'Lô nhập',
        width: 220,
        filterable: true,
        renderCell: (params) => (
            <span className="admin-cell-text" title={String(params.value ?? '')}>
                {formatImportBatchCode(params.value as string)}
            </span>
        ),
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
        width: 160,
        filterable: true,
        type: 'date',
        valueGetter: (value) => (value ? new Date(value) : null),
        renderCell: (params) => <RenderCreatedAtCell value={params.value} />,
    },
    {
        field: 'status',
        headerName: 'Trạng thái',
        width: 96,
        minWidth: 88,
        filterable: false,
        renderCell: RenderStatusCell,
    },
    {
        field: 'ticketCondition',
        headerName: 'Tình trạng vé',
        width: 96,
        minWidth: 88,
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
        width: 80,
        align: 'right',
        renderCell: RenderActionsCell,
    },
];

export const columnsInitialState = {};
