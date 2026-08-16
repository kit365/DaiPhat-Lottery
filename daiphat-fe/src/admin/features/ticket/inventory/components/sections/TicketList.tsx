"use client";

import type {
    GridColDef,
} from '@mui/x-data-grid';
import { LazyDataGrid } from '@/admin/shared/data-grid/LazyDataGrid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { useMemo } from 'react';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import {
    IGridSettings,
    useSettings,
    columnsPanelStyles,
    dataGridContainerStyles,
    dataGridStyles,
    filterPanelStyles,
} from '../../../../../shared/data-grid';
import { TicketToolbar } from './TicketToolbar';
import { columnsConfig, columnsInitialState } from '../configs/column.config';
import { buildCancelSelectColumn } from '../configs/cancelSelectColumn.config';
import { DATA_GRID_LOCALE_VN } from "@/admin/components/data-grid/localeText.config";
import type { useTicketInventory } from '../../hooks/useTicketInventory';
import { useCancelTicketSelection } from '../../../import-batch/hooks/useCancelTicketSelection';
import { LazyReportSerialFaultPane } from '../../../import-batch/components/sections/LazyReportSerialFaultPane';
import { QUERY_KEYS } from '../../constants/queryKeys';

const toIsoDate = (d?: string) => {
    if (!d) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const parsed = dayjs(d, ['DD/MM/YYYY', 'YYYY-MM-DD'], true);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : d;
};

declare module '@mui/x-data-grid' {
    interface ToolbarPropsOverrides {
        settings: IGridSettings;
        onSettingsChange: import('react').Dispatch<import('react').SetStateAction<IGridSettings>>;
        cancelSelectedCount?: number;
        onCancelTicketsClick?: () => void;
    }
}

export const TicketList = ({
    ticketHook,
    cancelSelection: externalCancelSelection,
}: {
    ticketHook: ReturnType<typeof useTicketInventory>;
    cancelSelection?: ReturnType<typeof useCancelTicketSelection>;
}) => {
    const queryClient = useQueryClient();
    const { settings, setSettings } = useSettings();
    const {
        tickets,
        pagination,
        availableTicketStatusOptions,
        isLoading,
        error,
        filters,
        setFilter,
        setDateRangeFilter,
        clearFilters,
        setSearchFilter,
        paginationModel,
        onPaginationModelChange,
    } = ticketHook;

    const internalCancelSelection = useCancelTicketSelection(tickets);
    const cancelSelection = externalCancelSelection || internalCancelSelection;

    const columns = useMemo<GridColDef[]>(
        () => [
            buildCancelSelectColumn({
                selectedSerials: cancelSelection.selectedSerials,
                totalCancelableSerialsCount: cancelSelection.totalCancelableSerialsCount,
                onSelectAll: cancelSelection.handleSelectAll,
                onSelectTicket: cancelSelection.handleSelectTicket,
                getTicketSelectionState: cancelSelection.getTicketSelectionState,
            }),
            ...columnsConfig,
        ],
        [
            cancelSelection.selectedSerials,
            cancelSelection.totalCancelableSerialsCount,
            cancelSelection.handleSelectAll,
            cancelSelection.handleSelectTicket,
            cancelSelection.getTicketSelectionState,
        ]
    );

    const handleReportSuccess = () => {
        cancelSelection.closeReportDialog();
        cancelSelection.clearSelection();
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
    };

    if (error) {
        return (
            <Box sx={{ py: 5, textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>
                Lỗi khi tải danh sách vé số. Vui lòng thử lại.
            </Box>
        );
    }

    return (
        <>
            <Card elevation={0} className="admin-datagrid-card">
                <Box sx={dataGridContainerStyles}>
                    <LazyDataGrid
                        rows={tickets}
                        getRowId={(row) => row.id || row._id}
                        columns={columns}
                        density={settings.density || 'comfortable'}
                        showCellVerticalBorder={settings.showCellBorders}
                        showColumnVerticalBorder={settings.showColumnBorders}
                        showToolbar
                        disableColumnMenu
                        disableColumnSorting
                        slots={{
                            toolbar: TicketToolbar as any,
                            noRowsOverlay: () => (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: '100%',
                                    }}
                                >
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
                                        .filter((col) => col.field !== 'actions' && col.field !== 'cancelSelect')
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
                                availableTicketStatusOptions,
                                onFilterChange: setFilter,
                                onClearFilters: clearFilters,
                                onSearchChange: setSearchFilter,
                                onDateRangeChange: ({ startDate, endDate }: { startDate: string; endDate: string }) =>
                                    setDateRangeFilter(toIsoDate(startDate), toIsoDate(endDate)),
                                cancelSelectedCount: cancelSelection.selectedSerials.length,
                                onCancelTicketsClick: cancelSelection.openReportDialog,
                            } as any,
                        }}
                        localeText={DATA_GRID_LOCALE_VN}
                        pagination
                        paginationMode="server"
                        loading={isLoading}
                        rowCount={pagination?.totalRecords || 0}
                        paginationModel={paginationModel}
                        onPaginationModelChange={onPaginationModelChange}
                        pageSizeOptions={[5, 10, 20, 50]}
                        initialState={columnsInitialState}
                        getRowHeight={() => 'auto'}
                        disableRowSelectionOnClick
                        className="admin-datagrid"
                        sx={dataGridStyles}
                    />
                </Box>
            </Card>

            {cancelSelection.isReportDialogOpen && (
            <Dialog
                open={cancelSelection.isReportDialogOpen}
                onClose={cancelSelection.closeReportDialog}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '20px',
                        p: 3,
                        maxHeight: '90vh',
                        height: '90vh',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        bgcolor: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    },
                }}
            >
                <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <LazyReportSerialFaultPane
                        serials={cancelSelection.selectedSerials}
                        ticketNumbers={cancelSelection.reportDialogProps.ticketNumbers}
                        ticketId={cancelSelection.reportDialogProps.ticketId}
                        importBatchLineId={cancelSelection.reportDialogProps.importBatchLineId}
                        stationId={cancelSelection.reportDialogProps.stationId}
                        drawDate={cancelSelection.reportDialogProps.drawDate}
                        defaultCancelMode="TICKET"
                        onCancel={cancelSelection.closeReportDialog}
                        onSuccess={handleReportSuccess}
                    />
                </DialogContent>
            </Dialog>
            )}
        </>
    );
};
