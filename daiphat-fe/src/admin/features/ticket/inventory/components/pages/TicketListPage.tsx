"use client";

import { useState } from 'react';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { Box, Button, Stack } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { prefixAdmin } from '../../../../../constants/routes';
import { useTicketInventory } from '../../hooks/useTicketInventory';
import { TicketList } from '../sections/TicketList';
import { QUERY_KEYS } from '../../constants/queryKeys';
import dayjs from 'dayjs';
import { IncompleteImportBatchNotification } from '../../../import-batch/components/sections/IncompleteImportBatchNotification';
import { ImportBatchFileImportDialog } from '../../../import-batch/components/sections/ImportBatchFileImportDialog';
import { useCancelTicketSelection } from '../../../import-batch/hooks/useCancelTicketSelection';

export const TicketListPage = () => {
    const queryClient = useQueryClient();
    const [fileImportOpen, setFileImportOpen] = useState(false);
    const todayIso = dayjs().format('YYYY-MM-DD');

    const ticketHook = useTicketInventory({
        drawDateFrom: todayIso,
        drawDateTo: todayIso,
    });

    const cancelSelection = useCancelTicketSelection(ticketHook.tickets);

    const handleFileImportSuccess = () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
    };

    return (
        <Box className="admin-page" sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 3 } }}>
            <PageHeader
                title="Danh sách vé số"
                breadcrumbItems={[
                    { label: 'Bảng điều khiển', to: '/' },
                    { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                    { label: 'Danh sách' },
                ]}
                action={
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<UploadFileOutlinedIcon />}
                                onClick={() => setFileImportOpen(true)}
                                sx={{
                                    minHeight: '2.4rem',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    borderColor: '#cbd5e1',
                                    color: '#334155',
                                    bgcolor: '#ffffff',
                                    py: 0.8,
                                    px: 2,
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                    '&:hover': {
                                        borderColor: '#94a3b8',
                                        bgcolor: '#f8fafc',
                                    },
                                }}
                            >
                                Nhập từ tệp
                            </Button>
                        </CanAccess>

                        <Button
                            variant="contained"
                            color="error"
                            size="small"
                            startIcon={<ReportProblemIcon />}
                            disabled={cancelSelection.selectedSerials.length === 0}
                            onClick={cancelSelection.openReportDialog}
                            sx={{
                                minHeight: '2.4rem',
                                textTransform: 'none',
                                fontWeight: 800,
                                borderRadius: '10px',
                                boxShadow: cancelSelection.selectedSerials.length > 0 ? '0 4px 12px rgba(239, 68, 68, 0.25)' : 'none',
                                py: 0.8,
                                px: 2.2,
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

            <ImportBatchFileImportDialog
                open={fileImportOpen}
                onClose={() => setFileImportOpen(false)}
                onImported={handleFileImportSuccess}
            />
        </Box>
    );
};
