/** Locale tiếng Việt cho MUI DataGrid — chỉ dùng trong admin. */
import type { GridLocaleText } from '@mui/x-data-grid';

export const DATA_GRID_LOCALE_VN: Partial<GridLocaleText> = {
    noRowsLabel: 'Không có dữ liệu',
    noResultsOverlayLabel: 'Không tìm thấy kết quả.',
    toolbarColumns: 'Cột',
    toolbarFilters: 'Bộ lọc',
    toolbarExport: 'Xuất',
    toolbarExportCSV: 'Tải xuống CSV',
    toolbarExportPrint: 'In',
    columnMenuLabel: 'Menu',
    columnMenuShowColumns: 'Hiện cột',
    columnMenuFilter: 'Lọc',
    columnMenuHideColumn: 'Ẩn',
    columnMenuSortAsc: 'Sắp xếp tăng dần',
    columnMenuSortDesc: 'Sắp xếp giảm dần',
    paginationRowsPerPage: 'Số dòng mỗi trang:',
    paginationDisplayedRows: ({ from, to, count, estimated }) => {
        if (count === -1) {
            return `${from}–${to} của ${estimated ?? 'nhiều'}`;
        }

        return `${from}–${to} của ${count}`;
    },
};
