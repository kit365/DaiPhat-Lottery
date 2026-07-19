import { GridDensity } from "@mui/x-data-grid";

export interface IGridSettings {
    density?: GridDensity;
    showCellBorders?: boolean;
    showColumnBorders?: boolean;
}

export interface IStreetAgentListFilters {
    status: string[];
    contactProvince: string[];
    search: string;
    page: number;
    limit: number;
}
