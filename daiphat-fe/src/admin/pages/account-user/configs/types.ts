import { GridDensity } from "@mui/x-data-grid";

export interface IGridSettings {
    density?: GridDensity;
    showCellBorders?: boolean;
    showColumnBorders?: boolean;
}

export interface IAccountUserListFilters {
    status: string[];
    search: string;
    page: number;
    limit: number;
    sortBy: string;
    direction: string;
}
