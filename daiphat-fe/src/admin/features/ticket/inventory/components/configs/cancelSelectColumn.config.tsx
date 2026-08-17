import { Box, Checkbox, Tooltip } from '@mui/material';
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

const INELIGIBLE_TICKET_HINT = 'Vé hết hạn hoặc đã hủy — không thể chọn';

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
    renderHeader: () => {
        const hasCancelable = totalCancelableSerialsCount > 0;
        const headerCheckbox = (
            <Checkbox
                size="small"
                disabled={!hasCancelable}
                indeterminate={
                    selectedSerials.length > 0 && selectedSerials.length < totalCancelableSerialsCount
                }
                checked={hasCancelable && selectedSerials.length === totalCancelableSerialsCount}
                onChange={(event) => {
                    if (!hasCancelable) {
                        return;
                    }
                    onSelectAll(event.target.checked);
                }}
                sx={{
                    opacity: hasCancelable ? 1 : 0.38,
                    color: 'action.disabled',
                    '&.Mui-disabled': {
                        color: 'action.disabled',
                    },
                }}
            />
        );

        return (
            <Box sx={checkboxCellSx}>
                {hasCancelable ? (
                    headerCheckbox
                ) : (
                    <Tooltip title="Không có vé đủ điều kiện để chọn trên trang này" arrow>
                        <span>{headerCheckbox}</span>
                    </Tooltip>
                )}
            </Box>
        );
    },
    renderCell: (params) => {
        const ticket = params.row as CancelTicketLike;
        const { isChecked, isIndeterminate, isSelectable } = getTicketSelectionState(ticket);

        const rowCheckbox = (
            <Checkbox
                size="small"
                disabled={!isSelectable}
                checked={isSelectable && isChecked}
                indeterminate={isSelectable && isIndeterminate}
                onChange={(event) => {
                    if (!isSelectable) {
                        return;
                    }
                    onSelectTicket(ticket, event.target.checked);
                }}
                onClick={(event) => event.stopPropagation()}
                sx={{
                    opacity: isSelectable ? 1 : 0.38,
                    color: isSelectable ? undefined : 'action.disabled',
                    '&.Mui-disabled': {
                        color: 'action.disabled',
                    },
                }}
            />
        );

        return (
            <Box sx={{ ...checkboxCellSx, opacity: isSelectable ? 1 : 0.55 }}>
                {isSelectable ? (
                    rowCheckbox
                ) : (
                    <Tooltip title={INELIGIBLE_TICKET_HINT} arrow>
                        <span>{rowCheckbox}</span>
                    </Tooltip>
                )}
            </Box>
        );
    },
});
