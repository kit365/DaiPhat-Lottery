import { GridColDef } from "@mui/x-data-grid";
import {
    RenderActionsCell,
    RenderTitleCell,
    RenderStatusCell,
    RenderCreatedAtCell
} from '../utils/render-cells';

export const columnsConfig: GridColDef<any>[] = [
    {
        field: "name",
        headerName: "Tên nhà đài",
        flex: 1,
        minWidth: 200,
        hideable: false,
        renderCell: RenderTitleCell,
    },
    {
        field: "drawSchedule",
        headerName: "Lịch quay",
        width: 150,
        renderCell: (params) => {
            const drawDays = params.row.drawDays;
            const drawTime = params.row.drawTime;
            
            let formatted = 'Chưa có';
            if (drawDays && drawDays.length > 0) {
                const dayMap: Record<string, string> = {
                    'MONDAY': 'T2', 'TUESDAY': 'T3', 'WEDNESDAY': 'T4',
                    'THURSDAY': 'T5', 'FRIDAY': 'T6', 'SATURDAY': 'T7', 'SUNDAY': 'CN'
                };
                const days = drawDays.map((d: string) => dayMap[d] || d).join(', ');
                formatted = `${days} (${drawTime || '--:--'})`;
            }
            
            return (
                <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                    {formatted}
                </span>
            );
        }
    },
    {
        field: "commissionRate",
        headerName: "Hoa hồng",
        width: 110,
        renderCell: (params) => (
            <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                {params.value != null ? `${(Number(params.value) * 100).toFixed(1)}%` : "—"}
            </span>
        ),
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
        field: "isActive",
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
