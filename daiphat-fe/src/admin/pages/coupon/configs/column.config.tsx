import { GridColDef } from "@mui/x-data-grid";
import {
    RenderActionsCell,
    RenderTitleCell,
    RenderStatusCell,
    RenderCreatedAtCell,
    RenderTypeDiscountCell,
    RenderValueCell,
} from '../utils/render-cells';

export const columnsConfig: GridColDef<any>[] = [
    {
        field: "name",
        headerName: "Tên mã giảm giá",
        flex: 1,
        minWidth: 200,
        hideable: false,
        renderCell: RenderTitleCell,
    },
    {
        field: "code",
        headerName: "Mã",
        width: 120,
        renderCell: (params) => (
            <span style={{ fontWeight: 600, color: '#006C9C' }}>{params.value}</span>
        )
    },
    {
        field: "typeDiscount",
        headerName: "Loại giảm",
        width: 140,
        renderCell: RenderTypeDiscountCell,
    },
    {
        field: "value",
        headerName: "Giá trị",
        width: 120,
        renderCell: RenderValueCell,
    },
    {
        field: "usageLimit",
        headerName: "Giới hạn",
        width: 100,
        renderCell: (params) => {
            const { usageLimit, usedCount } = params.row;
            return <span>{usedCount || 0}/{usageLimit || '∞'}</span>;
        }
    },
    {
        field: "status",
        headerName: "Trạng thái",
        width: 120,
        renderCell: RenderStatusCell,
    },
    {
        field: "createdAt",
        headerName: "Ngày tạo",
        width: 140,
        filterable: true,
        type: "dateTime",
        valueGetter: (value) => value ? new Date(value) : null,
        renderCell: (params) => <RenderCreatedAtCell value={params.value} />,
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




