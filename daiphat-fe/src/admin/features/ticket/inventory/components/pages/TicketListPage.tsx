"use client";

import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { Stack, Button } from '@mui/material';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { prefixAdmin } from '../../../../../constants/routes';
import { useTicketInventory } from '../../hooks/useTicketInventory';
import { TicketList } from '../sections/TicketList';
import dayjs from 'dayjs';
import { IncompleteImportBatchNotification } from '../../../import-batch/components/sections/IncompleteImportBatchNotification';
import { useCancelTicketSelection } from '../../../import-batch/hooks/useCancelTicketSelection';

export const TicketListPage = () => {
    const parseToISO = (dateStr: string) => {
        if (!dateStr) return undefined;
        const parts = dateStr.split('/');
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    };

    const today = dayjs().format('DD/MM/YYYY');

    const ticketHook = useTicketInventory({
        drawDateFrom: parseToISO(today),
        drawDateTo: parseToISO(today),
    });

    const cancelSelection = useCancelTicketSelection(ticketHook.tickets);

    return (
        <>
            <PageHeader
                title="Danh sách vé số"
                breadcrumbItems={[
                            { label: 'Bảng điều khiển', to: '/' },
                            { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Danh sách' },
                        ]}
                action={
                    <Stack direction="row" spacing={1.5} alignItems="center">
                    <Button
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<ReportProblemIcon />}
                        disabled={cancelSelection.selectedSerials.length === 0}
                        onClick={cancelSelection.openReportDialog}
                        sx={{
                            minHeight: '2.25rem',
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: '8px',
                            boxShadow: 'none',
                            py: 0.8,
                            px: 2,
                            '&.Mui-disabled': {
                                bgcolor: '#f1f5f9',
                                color: '#94a3b8',
                                borderColor: '#cbd5e1',
                            },
                        }}
                    >
                        Tiến hành hủy vé{cancelSelection.selectedSerials.length > 0 && ` (${cancelSelection.selectedSerials.length})`}
                    </Button>
                </Stack>
                }
            />

            <CanAccess anyOf={[PERMISSIONS.TICKET.CREATE, PERMISSIONS.IMPORT_BATCH.VIEW]}>
                <IncompleteImportBatchNotification />
            </CanAccess>

            <TicketList ticketHook={ticketHook} cancelSelection={cancelSelection} />
        </>
    );
};
