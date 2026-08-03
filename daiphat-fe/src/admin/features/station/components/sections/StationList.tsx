"use client";

import { useMemo, useState } from 'react';
import {
    DataGrid,
    GridColDef,
} from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../../assets/icons';
import {
    IGridSettings,
    useSettings,
    columnsPanelStyles,
    dataGridStyles,
    filterPanelStyles,
} from '../../../../shared/data-grid';
import { StationToolbar } from './StationToolbar';
import { columnsConfig, columnsInitialState } from '../configs/column.config';
import { DATA_GRID_LOCALE_VN } from '../../../../../shared/components/DataTable/localeText.config';
import { useStations } from '../../hooks/useStation';
import { StationListFilters } from '../../types/station.type';

declare module '@mui/x-data-grid' {
    interface ToolbarPropsOverrides {
        settings: IGridSettings;
        onSettingsChange: import("react").Dispatch<import("react").SetStateAction<IGridSettings>>;
    }
}

const initialFilters: StationListFilters = {
    status: [],
    region: [],
    drawDay: [],
    search: '',
    page: 1,
    limit: 10,
};

export const StationList = () => {
    const { settings, setSettings } = useSettings();
    const [filters, setFilters] = useState<StationListFilters>(initialFilters);

    const queryParams = useMemo(
        () => ({
            search: filters.search || undefined,
            status:
                filters.status && filters.status.length > 0
                    ? filters.status.join(',')
                    : undefined,
            region:
                filters.region && filters.region.length > 0
                    ? filters.region.join(',')
                    : undefined,
            drawDay:
                filters.drawDay && filters.drawDay.length > 0
                    ? filters.drawDay.join(',')
                    : undefined,
            sortBy: filters.sortBy,
            direction: filters.direction,
            page: filters.page,
            limit: filters.limit,
        }),
        [filters]
    );

    const { data, isLoading, isFetching, error } = useStations(queryParams);

    const stations = data?.data?.recordList || [];
    const pagination = data?.data?.pagination || {
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
        limit: 10,
    };

    const setFilter = (fieldId: string, values: string[]) => {
        setFilters((prev) => ({ ...prev, [fieldId]: values, page: 1 }));
    };

    const setSearchFilter = (search: string) => {
        setFilters((prev) =>
            prev.search === search ? prev : { ...prev, search, page: 1 }
        );
    };

    const setPage = (page: number) => {
        setFilters((prev) => (prev.page === page ? prev : { ...prev, page }));
    };

    const setLimit = (limit: number) => {
        setFilters((prev) =>
            prev.limit === limit ? prev : { ...prev, limit, page: 1 }
        );
    };

    const setSort = (sortBy?: string, direction?: string) => {
        setFilters((prev) =>
            prev.sortBy === sortBy && prev.direction === direction
                ? prev
                : { ...prev, sortBy, direction, page: 1 }
        );
    };

    const clearFilters = () => {
        setFilters(initialFilters);
    };

    if (error) {
        return (
            <Box sx={{ py: 5, textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>
                Lỗi khi tải danh sách nhà đài. Vui lòng thử lại.
            </Box>
        );
    }

    return (
        <Card elevation={0} className="admin-datagrid-card">
            <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <DataGrid
                    rows={stations}
                    getRowId={(row) => row._id || row.id}
                    columns={columnsConfig}
                    density={settings.density || 'comfortable'}
                    showCellVerticalBorder={settings.showCellBorders}
                    showColumnVerticalBorder={settings.showColumnBorders}
                    showToolbar
                    slots={{
                        toolbar: StationToolbar as any,
                        columnSortedAscendingIcon: SortAscendingIcon,
                        columnSortedDescendingIcon: SortDescendingIcon,
                        columnUnsortedIcon: UnsortedIcon,
                        noRowsOverlay: () => (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                {isLoading ? (
                                    <CircularProgress size={32} />
                                ) : (
                                    <span className="admin-datagrid-empty">Không có dữ liệu</span>
                                )}
                            </Box>
                        ),
                    }}
                    slotProps={{
                        columnsManagement: {
                            getTogglableColumns: (columns: GridColDef[]) =>
                                columns
                                    .filter((col) => col.field !== 'actions')
                                    .map((col) => col.field),
                        },
                        columnsPanel: {
                            sx: columnsPanelStyles,
                        },
                        filterPanel: {
                            sx: filterPanelStyles,
                        },
                        toolbar: {
                            settings,
                            onSettingsChange: setSettings,
                            filters,
                            onFilterChange: setFilter,
                            onClearFilters: clearFilters,
                            onSearchChange: setSearchFilter,
                        } as any,
                    }}
                    localeText={DATA_GRID_LOCALE_VN}
                    pagination
                    paginationMode="server"
                    sortingMode="server"
                    sortModel={
                        filters.sortBy
                            ? [{
                                field: filters.sortBy === 'drawTime' ? 'drawSchedule' : filters.sortBy,
                                sort: filters.direction as 'asc' | 'desc',
                            }]
                            : []
                    }
                    onSortModelChange={(newModel) => {
                        if (newModel.length > 0) {
                            const field = newModel[0].field === 'drawSchedule' ? 'drawTime' : newModel[0].field;
                            setSort(field, newModel[0].sort ?? undefined);
                        } else {
                            setSort(undefined, undefined);
                        }
                    }}
                    loading={isFetching}
                    rowCount={Number(pagination?.totalRecords) || 0}
                    paginationModel={{
                        page: filters.page - 1,
                        pageSize: filters.limit,
                    }}
                    onPaginationModelChange={(model) => {
                        if (model.page + 1 !== filters.page) {
                            setPage(model.page + 1);
                        }
                        if (model.pageSize !== filters.limit) {
                            setLimit(model.pageSize);
                        }
                    }}
                    pageSizeOptions={[5, 10, 20]}
                    initialState={columnsInitialState}
                    getRowHeight={() => 'auto'}
                    disableRowSelectionOnClick
                    className="admin-datagrid"
                    sx={dataGridStyles}
                />
            </Box>
        </Card>
    );
};
