import { Box, Checkbox } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import type { CancelSelectedSerial, CancelTicketLike } from '../../../import-batch/hooks/useCancelTicketSelection';

export type CancelSelectColumnParams = {
    selectedSerials: CancelSelectedSerial[];
    totalCancelableSerialsCount: number;
    onSelectAll: (checked: boolean) => void;
    onSelectTicket: (ticket: CancelTicketLike, checked: boolean) => void;
    getTicketSelectionState: (ticket: CancelTicketLike) => {
        cancelableCount: number;
        isChecked: boolean;
        isIndeterminate: boolean;
        isSelectable: boolean;
    };
};

const checkboxCellSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
};

export const buildCancelSelectColumn = ({
    selectedSerials,
    totalCancelableSerialsCount,
    onSelectAll,
    onSelectTicket,
    getTicketSelectionState,
}: CancelSelectColumnParams): GridColDef => ({
    field: 'cancelSelect',
    headerName: '',
    width: 72,
    minWidth: 72,
    maxWidth: 72,
    sortable: false,
    filterable: false,
    hideable: false,
    disableColumnMenu: true,
    align: 'center',
    headerAlign: 'center',
    headerClassName: 'admin-datagrid-cancel-select-header',
    cellClassName: 'admin-datagrid-cancel-select-cell',
    renderHeader: () => (
        <Box sx={checkboxCellSx}>
            <Checkbox
                size="small"
                indeterminate={
                    selectedSerials.length > 0 && selectedSerials.length < totalCancelableSerialsCount
                }
                checked={
                    totalCancelableSerialsCount > 0 && selectedSerials.length === totalCancelableSerialsCount
                }
                onChange={(event) => onSelectAll(event.target.checked)}
            />
        </Box>
    ),
    renderCell: (params) => {
        const ticket = params.row as CancelTicketLike;
        const { isChecked, isIndeterminate, isSelectable } = getTicketSelectionState(ticket);

        return (
            <Box sx={checkboxCellSx}>
                <Checkbox
                    size="small"
                    disabled={!isSelectable}
                    checked={isChecked}
                    indeterminate={isIndeterminate}
                    onChange={(event) => onSelectTicket(ticket, event.target.checked)}
                    onClick={(event) => event.stopPropagation()}
                />
            </Box>
        );
    },
});
