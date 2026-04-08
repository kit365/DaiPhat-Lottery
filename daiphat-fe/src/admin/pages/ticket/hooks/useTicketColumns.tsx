import { useTranslation } from 'react-i18next';
import { GridColDef } from '@mui/x-data-grid';
import { RenderActionsCell, RenderTicketCell, RenderStatusCell, RenderStockCell } from '../utils/render-cells';
import { ITicket } from '../configs/types';
import { useMemo } from 'react';

export const useTicketColumns = (isTrash: boolean = false) => {
    const { t } = useTranslation();

    const columns: GridColDef<ITicket>[] = useMemo(() => [
        {
            field: "ticket",
            headerName: "Tên vé số",
            flex: 1,
            hideable: false,
            filterable: true,
            renderCell: RenderTicketCell,
        },
        {
            field: "category",
            headerName: "Loại hình",
            width: 180,
            filterable: true,
        },
        {
            field: "providerName",
            headerName: "Nhà đài",
            width: 140,
            filterable: true,
        },
        {
            field: "stock",
            headerName: "Số lượng",
            width: 160,
            filterable: false,
            renderCell: (params) => <RenderStockCell {...params} />,
        },
        {
            field: "price",
            headerName: "Giá vé",
            width: 120,
            filterable: true,
        },
        {
            field: "status",
            headerName: t("admin.common.status"),
            width: 120,
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
            renderCell: (params) => <RenderActionsCell {...params} isTrash={isTrash} />,
        },
    ], [t, isTrash]);

    return columns;
};
