"use client";

import { useMemo, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import DocumentScannerOutlinedIcon from '@mui/icons-material/DocumentScannerOutlined';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { Alert, Box, Button, Stack, Tooltip, Typography } from '@mui/material';
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
import { useTodayImportIntakeSummary } from '../../../import-batch/hooks/useImportBatchIntakeGate';
import { OcrTicketImportDialog } from '../../../ocr-import/components/OcrTicketImportDialog';

export const TicketListPage = () => {
    const queryClient = useQueryClient();
    const [fileImportOpen, setFileImportOpen] = useState(false);
    const [ocrImportOpen, setOcrImportOpen] = useState(false);
    const todayIso = dayjs().format('YYYY-MM-DD');

    const ticketHook = useTicketInventory({
        drawDateFrom: todayIso,
        drawDateTo: todayIso,
    });

    const cancelSelection = useCancelTicketSelection(ticketHook.tickets);
    const hasSelectedSerials = cancelSelection.selectedSerials.length > 0;

    const { allBlockedForToday } = useTodayImportIntakeSummary();

    /**
     * Why cancelling is unavailable, or null when it is available.
     *
     * <p>A ticket may only be cancelled while its draw date's stock is still on
     * the shelf. Once the return sweep for that date begins the unsold tickets are
     * being counted and boxed for the supplier, and once the date is past that
     * count has been handed over — voiding one afterwards would contradict a
     * figure both sides already signed for.
     *
     * <p>Judged from the rows actually on screen. The server decides per ticket,
     * because the sweep time belongs to each ticket's own supplier; this only
     * disables the button when every row in view is certainly beyond it, so the
     * operator is never sent into a dialog that can only fail.
     */
    const cancelLockReason = useMemo(() => {
        const drawDates: string[] = Array.from(
            new Set<string>(
                (ticketHook.tickets ?? [])
                    .map((ticket) => (ticket.drawDate ? String(ticket.drawDate) : ''))
                    .filter((value: string) => value.length > 0)
            )
        );
        if (drawDates.length === 0) {
            return null;
        }

        const stillAhead = drawDates.some((date) => dayjs(date).isAfter(todayIso, 'day'));
        if (stillAhead) {
            return null;
        }
        const includesToday = drawDates.some((date) => dayjs(date).isSame(todayIso, 'day'));
        if (includesToday && !allBlockedForToday) {
            return null;
        }
        return includesToday
            ? 'Đã tới giờ chốt vé trả nhà cung cấp — không thể hủy vé hôm nay.'
            : 'Vé đã chốt trả nhà cung cấp — không thể hủy vé kỳ quay cũ.';
    }, [ticketHook.tickets, allBlockedForToday, todayIso]);

    const handleFileImportSuccess = () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
    };

    const handleCancelPrimaryClick = () => {
        if (!cancelSelection.isCancelMode) {
            cancelSelection.enterCancelMode();
            return;
        }
        if (!hasSelectedSerials) {
            cancelSelection.exitCancelMode();
            return;
        }
        cancelSelection.openReportDialog();
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
                        <CanAccess permission={PERMISSIONS.TICKET.CREATE}>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<DocumentScannerOutlinedIcon />}
                                onClick={() => setOcrImportOpen(true)}
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
                                Nhập vé bằng OCR
                            </Button>
                        </CanAccess>
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

                        {hasSelectedSerials && (
                            <Button
                                variant="outlined"
                                color="inherit"
                                size="small"
                                startIcon={<CloseIcon />}
                                onClick={cancelSelection.exitCancelMode}
                                sx={{
                                    minHeight: '2.4rem',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    borderColor: '#cbd5e1',
                                    color: '#475569',
                                    bgcolor: '#ffffff',
                                    py: 0.8,
                                    px: 2,
                                    '&:hover': {
                                        borderColor: '#94a3b8',
                                        bgcolor: '#f8fafc',
                                    },
                                }}
                            >
                                Hủy chọn
                            </Button>
                        )}

                        <Tooltip title={cancelLockReason ?? ''}>
                            <span>
                                <Button
                                    variant="contained"
                                    color="error"
                                    size="small"
                                    disabled={Boolean(cancelLockReason)}
                                    startIcon={<ReportProblemIcon />}
                                    onClick={handleCancelPrimaryClick}
                                    sx={{
                                        minHeight: '2.4rem',
                                        textTransform: 'none',
                                        fontWeight: 800,
                                        borderRadius: '10px',
                                        boxShadow: hasSelectedSerials
                                            ? '0 4px 12px rgba(239, 68, 68, 0.25)'
                                            : 'none',
                                        py: 0.8,
                                        px: 2.2,
                                    }}
                                >
                                    {hasSelectedSerials
                                        ? `Tiến hành hủy vé (${cancelSelection.selectedSerials.length})`
                                        : 'Hủy vé'}
                                </Button>
                            </span>
                        </Tooltip>
                    </Stack>
                }
            />

            <CanAccess anyOf={[PERMISSIONS.TICKET.CREATE, PERMISSIONS.IMPORT_BATCH.VIEW]}>
                <IncompleteImportBatchNotification />
            </CanAccess>

            {cancelLockReason && (
                <Alert
                    severity="warning"
                    icon={<ReportProblemIcon fontSize="inherit" />}
                    sx={{ mb: 3, borderRadius: '12px', alignItems: 'center', fontWeight: 600 }}
                >
                    {cancelLockReason}
                </Alert>
            )}

            <TicketList ticketHook={ticketHook} cancelSelection={cancelSelection} />

            <ImportBatchFileImportDialog
                open={fileImportOpen}
                onClose={() => setFileImportOpen(false)}
                onImported={handleFileImportSuccess}
            />

            <OcrTicketImportDialog
                open={ocrImportOpen}
                onClose={() => setOcrImportOpen(false)}
                onImported={handleFileImportSuccess}
            />
        </Box>
    );
};
