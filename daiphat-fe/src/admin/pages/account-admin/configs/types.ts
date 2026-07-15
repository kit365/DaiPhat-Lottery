import { GridDensity } from "@mui/x-data-grid";

export interface IGridSettings {
    density?: GridDensity;
    showCellBorders?: boolean;
    showColumnBorders?: boolean;
}

export interface IAccountAdminListFilters {
    status: string[];
    roleIds: string[];
    search: string;
    page: number;
    limit: number;
    sortBy: string;
    direction: string;
}
