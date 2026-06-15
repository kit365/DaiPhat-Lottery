import { GridDensity } from '@mui/x-data-grid';

// Định nghĩa kiểu dữ liệu cho một vé số (Row)
export interface ITicket {
    id: number | string;
    providerName: string;
    serialNumber: string;
    numbers: string;
    drawDate: string;
    batchCode: string;
    image: string;
    createdAt: Date;
    status: string;
    statusDisplayName: string;
}

// Định nghĩa kiểu dữ liệu cho Settings của Grid
export interface IGridSettings {
    density?: GridDensity;
    showCellBorders?: boolean;
    showColumnBorders?: boolean;
}

// Định nghĩa kiểu cho các Option trong SelectMulti
export interface ISelectOption {
    value: string;
    label: string;
}
