import { GridDensity } from '@mui/x-data-grid';

// Định nghĩa kiểu dữ liệu cho một vé số (Row)
export interface ITicket {
    id: number;
    ticket: string;
    category: string;
    image: string;
    createdAt: Date;
    stock: number;
    price: number;
    status: 'active' | 'inactive' | 'draft';
    providerName?: string;
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
