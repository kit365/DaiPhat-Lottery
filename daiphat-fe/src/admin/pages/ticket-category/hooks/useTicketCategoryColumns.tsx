import { useTranslation } from 'react-i18next';
import { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import {
    RenderActionsCell,
    RenderTitleCell,
    RenderStatusCell,
    RenderCreatedAtCell
} from '../utils/render-cells';

export const useTicketCategoryColumns = (isTrash: boolean = false) => {
    const { t } = useTranslation();

    const columns: GridColDef<any>[] = useMemo(() => [
        {
            field: "name",
            headerName: t("admin.ticket_category.fields.name") || "Category Name",
            flex: 1,
            minWidth: 200,
            hideable: false,
            renderCell: RenderTitleCell,
        },
        {
            field: "parentName",
            headerName: t("admin.ticket_category.fields.parent") || "Parent Category",
            width: 180,
        },
        {
            field: "createdAt",
            headerName: t("admin.common.created_at") || "Created At",
            width: 160,
            filterable: true,
            type: "dateTime",
            valueGetter: (value) => value ? new Date(value) : null,
            renderCell: (params) => <RenderCreatedAtCell value={params.value} />,
        },
        {
            field: "status",
            headerName: t("admin.common.status"),
            width: 140,
            renderCell: RenderStatusCell,
        },
        {
            field: "ticketCount",
            headerName: t("admin.ticket_category.fields.ticket_count") || "Số lượng vé",
            width: 140,
            align: 'center',
            headerAlign: 'center',
        },
        {
            field: 'actions',
            headerName: '',
            width: 80,
            sortable: false,
            filterable: false,
            align: 'right',
            renderCell: (params) => <RenderActionsCell {...params} isTrash={isTrash} />,
        },
    ], [t, isTrash]);

    return columns;
};




