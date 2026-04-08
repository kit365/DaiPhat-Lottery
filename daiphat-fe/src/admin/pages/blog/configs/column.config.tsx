import { GridColDef } from "@mui/x-data-grid";
import {
    RenderActionsCell,
    RenderTitleCell,
    RenderStatusCell,
    RenderCreatedAtCell
} from '../utils/render-cells';

export const columnsConfig: GridColDef<any>[] = [
    {
        field: "title",
        headerName: "Bài viết",
        flex: 1,
        minWidth: 200,
        hideable: false,
        renderCell: RenderTitleCell,
    },
    {
        field: "createdAt",
        headerName: "Thời gian tạo",
        width: 160,
        filterable: true,
        type: "dateTime",
        valueGetter: (value) => value ? new Date(value) : null,
        renderCell: (params) => <RenderCreatedAtCell value={params.value} />,
    },
    {
        field: "status",
        headerName: "Trạng thái",
        width: 140,
        renderCell: RenderStatusCell,
    },
    {
        field: 'actions',
        headerName: '',
        width: 80,
        sortable: false,
        filterable: false,
        align: 'right',
        renderCell: RenderActionsCell,
    },
];

export const columnsInitialState = {
    pagination: {
        paginationModel: { page: 0, pageSize: 10 },
    },
};




