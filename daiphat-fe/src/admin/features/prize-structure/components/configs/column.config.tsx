import { GridColDef } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import { PrizeStructureResponse } from '../../types/prize-structure';

export const columnsConfig: GridColDef<PrizeStructureResponse>[] = [
    {
        field: 'displayOrder',
        headerName: 'STT',
        width: 80,
        sortable: true,
        headerAlign: 'center',
        align: 'center',
    },
    {
        field: 'prizeCode',
        headerName: 'Mã giải',
        flex: 1,
        minWidth: 100,
        sortable: true,
        renderCell: (params) => (
            <Typography variant="body2" fontWeight={600}>
                {params.value}
            </Typography>
        ),
    },
    {
        field: 'prizeDisplayName',
        headerName: 'Tên giải',
        flex: 1.5,
        minWidth: 150,
        sortable: true,
    },
    {
        field: 'prizeValue',
        headerName: 'Giá trị (VNĐ)',
        flex: 1.5,
        minWidth: 120,
        sortable: true,
        headerAlign: 'right',
        align: 'right',
        renderCell: (params) => (
            <Typography variant="body2" fontWeight={600} color="error.main">
                {params.value ? params.value.toLocaleString('vi-VN') : 0}
            </Typography>
        ),
    },
    {
        field: 'quantity',
        headerName: 'SL',
        width: 80,
        sortable: true,
        headerAlign: 'center',
        align: 'center',
    },
    {
        field: 'matchFromDisplayName',
        headerName: 'Điều kiện trúng',
        flex: 1.5,
        minWidth: 180,
        sortable: true,
        renderCell: (params) => {
            const display = params.row.matchFromDisplayName;
            const digits = params.row.matchDigits;
            if (!display) return null;
            
            if (display.toLowerCase() === 'khớp từ cuối' || display.toLowerCase() === 'khớp chữ số từ cuối') {
                return `Khớp ${digits} số cuối`;
            }
            if (display.toLowerCase() === 'khớp toàn bộ') {
                return `Khớp toàn bộ (${digits} số)`;
            }
            return display;
        }
    },
    {
        field: 'note',
        headerName: 'Ghi chú',
        flex: 2,
        minWidth: 200,
        sortable: false,
        renderCell: (params) => {
            const desc = params.row.description;
            if (!desc) return null;
            return (
                <div className="py-2 leading-relaxed">
                    <Typography variant="caption" color="text.secondary" display="block">
                        {desc}
                    </Typography>
                </div>
            );
        }
    }
];

export const columnsInitialState = {
    columns: {
        columnVisibilityModel: {},
    },
};
