import { GridDensity } from '@mui/x-data-grid';

export interface IGridSettings {
    density?: GridDensity;
    showCellBorders?: boolean;
    showColumnBorders?: boolean;
}

export interface ISelectOption {
    value: string;
    label: string;
}
