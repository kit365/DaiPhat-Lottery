import { useTranslation } from 'react-i18next';
import { GridColDef } from '@mui/x-data-grid';
import { RenderActionsCell, RenderTicketCell, RenderStatusCell, RenderCreatedAtCell, RenderDrawDateCell } from '../utils/render-cells';
import { ITicket } from '../configs/types';
import { useMemo } from 'react';

export const useTicketColumns = () => {
    const { t } = useTranslation();

    const columns: GridColDef<ITicket>[] = useMemo(() => [
        {
            field: "ticket",
            headerName: "Vé số",
            flex: 1,
            hideable: false,
            filterable: true,
            renderCell: RenderTicketCell,
        },
        {
            field: "drawDate",
            headerName: "Ngày quay",
            width: 140,
            filterable: true,
            renderCell: (params) => <RenderDrawDateCell {...params} />,
        },
        {
            field: "batchCode",
            headerName: "Lô nhập",
            width: 140,
            filterable: true,
        },
        {
            field: "createdAt",
            headerName: "Nhập lúc",
            width: 160,
            filterable: true,
            type: "date",
            renderCell: (params) => <RenderCreatedAtCell {...params} />,
        },
        {
            field: "status",
            headerName: "Trạng thái",
            width: 160,
            filterable: false,
            renderCell: (params) => <RenderStatusCell {...params} />,
        },
        {
            field: 'actions',
            headerName: '',
            sortable: false,
            filterable: false,
            hideable: false,
            disableColumnMenu: true,
            width: 64,
            align: 'right',
            renderCell: (params) => <RenderActionsCell {...params} />,
        },
    ], [t]);

    return columns;
};
