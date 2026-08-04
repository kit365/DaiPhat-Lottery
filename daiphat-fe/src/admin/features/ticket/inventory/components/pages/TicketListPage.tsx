"use client";

import AddIcon from '@mui/icons-material/Add';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { Stack, Button } from '@mui/material';
import { useNavigate } from '@/components/router-compat';
import { useTranslation } from 'react-i18next';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { LoadingButton } from '../../../../../components/ui/LoadingButton';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import { useTicketInventory } from '../../hooks/useTicketInventory';
import { TicketList } from '../sections/TicketList';
import { Tabs, Tab, Box } from '@mui/material';
import dayjs from 'dayjs';
import { useMemo, useState, SyntheticEvent } from 'react';
import { DateRangePicker } from '../../../../../components/ui/DateRangePicker';
import { IncompleteImportBatchNotification } from '../../../import-batch/components/sections/IncompleteImportBatchNotification';
import { useStationsByDrawDate } from '../../../../station/hooks/useStation';
import { getStationColor } from '../../../../station/utils/stationColor';
import { useCancelTicketSelection } from '../../../import-batch/hooks/useCancelTicketSelection';

export const TicketListPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const parseToISO = (dateStr: string) => {
        if (!dateStr) return undefined;
        const parts = dateStr.split('/');
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    };

    const initialStartDate = dayjs().format('DD/MM/YYYY');
    const initialEndDate = dayjs().format('DD/MM/YYYY');

    const ticketHook = useTicketInventory({
        drawDateFrom: parseToISO(initialStartDate),
        drawDateTo: parseToISO(initialEndDate),
    });

    const cancelSelection = useCancelTicketSelection(ticketHook.tickets);

    const [dateRange, setDateRange] = useState<{startDate: string, endDate: string}>({
        startDate: initialStartDate,
        endDate: initialEndDate,
    });

    const drawDateFrom = parseToISO(dateRange.startDate);
    const drawDateTo = parseToISO(dateRange.endDate);

    const drawDates = useMemo(() => {
        if (!drawDateFrom || !drawDateTo) return [];
        const start = dayjs(drawDateFrom);
        const end = dayjs(drawDateTo);
        const dates: string[] = [];
        let curr = start;
        while (curr.isBefore(end) || curr.isSame(end, 'day')) {
            dates.push(curr.format('YYYY-MM-DD'));
            curr = curr.add(1, 'day');
        }
        return dates;
    }, [drawDateFrom, drawDateTo]);

    const { data: stations } = useStationsByDrawDate(drawDates);

    const tabs = useMemo(() => {
        const uniqueStations = stations || [];
        
        return [
            { key: 'ALL', label: 'Tất cả', stationId: null },
            ...uniqueStations.map(station => ({
                key: station.id.toString(),
                label: station.name || `Nhà đài ${station.id}`,
                stationId: station.id,
            })),
        ];
    }, [stations]);

    const handleDateRangeChange = (range: { startDate: string; endDate: string }) => {
        setDateRange(range);
        const from = parseToISO(range.startDate);
        const to = parseToISO(range.endDate);
        ticketHook.setDateRangeFilter(from, to);
    };

    const [activeTab, setActiveTab] = useState<string>('ALL');

    const handleTabChange = (_: SyntheticEvent, newValue: string) => {
        setActiveTab(newValue);
        const tab = tabs.find(t => t.key === newValue);
        if (tab?.stationId) {
            ticketHook.setFilter('provider', [tab.stationId.toString()]);
        } else {
            ticketHook.setFilter('provider', []);
        }
    };

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Danh sách vé số" />
                    <Breadcrumb
                        items={[
                            { label: t('admin.dashboard.title'), to: '/' },
                            { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Danh sách' },
                        ]}
                    />
                </div>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <CanAccess permission={PERMISSIONS.TICKET.CREATE}>
                        <LoadingButton
                            onClick={() => navigate(ROUTES.ADMIN.TICKETS.CREATE)}
                            label="Thêm vé số"
                            startIcon={<AddIcon />}
                            className="btn-primary-admin"
                            sx={{
                                minHeight: '2.25rem',
                                padding: 'var(--shape-borderRadius-sm) calc(2 * var(--spacing))',
                            }}
                        />
                    </CanAccess>
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
            </div>

            <Stack spacing={2} sx={{ mb: 2 }}>
                <CanAccess anyOf={[PERMISSIONS.TICKET.CREATE, PERMISSIONS.IMPORT_BATCH.VIEW]}>
                    <IncompleteImportBatchNotification variant="detailed" />
                </CanAccess>
            </Stack>

            <Stack spacing={2} sx={{ mb: 2 }}>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">Lịch quay:</span>
                    <Box sx={{ width: 280 }}>
                        <DateRangePicker
                            startDate={dateRange.startDate}
                            endDate={dateRange.endDate}
                            onChange={handleDateRangeChange}
                            label="Lịch quay"
                        />
                    </Box>
                </div>
                
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                        TabIndicatorProps={{
                            style: {
                                backgroundColor: activeTab !== 'ALL' ? getStationColor(tabs.find(t => t.key === activeTab)?.stationId) : undefined,
                            }
                        }}
                    >
                        {tabs.map(tab => (
                            <Tab 
                                key={tab.key} 
                                label={tab.label} 
                                value={tab.key} 
                                sx={{
                                    color: tab.stationId ? getStationColor(tab.stationId) : 'inherit',
                                    fontWeight: '600',
                                    '&.Mui-selected': {
                                        color: tab.stationId ? getStationColor(tab.stationId) : 'primary.main',
                                    }
                                }}
                            />
                        ))}
                    </Tabs>
                </Box>
            </Stack>

            <TicketList ticketHook={ticketHook} cancelSelection={cancelSelection} />
        </>
    );
};
