"use client";

import { useMemo } from 'react';
import { Badge, Box, Button, SvgIcon, Toolbar } from '@mui/material';
import dayjs from 'dayjs';
import { Search } from '@/admin/components/ui/Search';
import { JiraFilter } from '@/admin/shared/data-grid';
import { StreetAgentReportStatus } from '../../types/street-agent.type';

const REPORT_STATUS_OPTIONS: Array<{ value: StreetAgentReportStatus; label: string }> = [
    { value: 'OPEN', label: 'Chưa chốt' },
    { value: 'FINALIZED', label: 'Đã chốt' },
];

const isRangeToken = (value: string) =>
    value.startsWith('month:')
    || value.startsWith('quarter:')
    || value.startsWith('range:');

/**
 * JiraFilter toggles are multi-select, but report period is one range at a time.
 * Keep the newly checked value (or remaining values after uncheck).
 */
export const normalizeDateRangeFilterValues = (
    previous: string[],
    next: string[],
): string[] => {
    const added = next.find((value) => !previous.includes(value));
    if (!added) return next;

    // Preset / DateRangePicker tokens replace the whole selection.
    if (isRangeToken(added) || previous.some(isRangeToken) || previous.length <= 1) {
        return [added];
    }

    return next.filter((value) => !isRangeToken(value));
};

/** Resolve JiraFilter `dateRange` values → API `{ from, to }` (YYYY-MM-DD). */
export const resolveReportDateRange = (values: string[]): { from: string; to: string } | null => {
    if (!values.length) return null;

    const rangeToken = values.find(isRangeToken);
    if (rangeToken) {
        const [, from, to] = rangeToken.split(':');
        if (from && to) return { from, to };
    }

    const dates = values.filter((value) => !isRangeToken(value)).sort();
    if (!dates.length) return null;
    return { from: dates[0], to: dates[dates.length - 1] };
};

export const buildDateRangeSelection = (from: string, to: string): string[] => {
    if (!from) return [];

    const today = dayjs().format('YYYY-MM-DD');
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
    const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');
    const quarterStartMonth = Math.floor(dayjs().month() / 3) * 3;
    const quarterStart = dayjs().month(quarterStartMonth).startOf('month').format('YYYY-MM-DD');
    const quarterEnd = dayjs().month(quarterStartMonth).add(2, 'month').endOf('month').format('YYYY-MM-DD');

    if (from === today && to === today) return [today];
    if (from === monthStart && to === monthEnd) return [`month:${monthStart}:${monthEnd}`];
    if (from === quarterStart && to === quarterEnd) return [`quarter:${quarterStart}:${quarterEnd}`];
    if (to && to !== from) return [`range:${from}:${to}`];
    return [from];
};

export type StreetAgentReportToolbarProps = {
    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder: string;
    from: string;
    to: string;
    status: StreetAgentReportStatus | '';
    onFilterChange: (fieldId: string, values: string[]) => void;
    onClearFilters: () => void;
};

export const StreetAgentReportToolbar = ({
    search,
    onSearchChange,
    searchPlaceholder,
    from,
    to,
    status,
    onFilterChange,
    onClearFilters,
}: StreetAgentReportToolbarProps) => {
    const filterFields = useMemo(() => {
        const today = dayjs().format('YYYY-MM-DD');
        const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
        const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');
        const quarterStartMonth = Math.floor(dayjs().month() / 3) * 3;
        const quarterStart = dayjs().month(quarterStartMonth).startOf('month');
        const quarterEnd = quarterStart.add(2, 'month').endOf('month');
        const quarterStartStr = quarterStart.format('YYYY-MM-DD');
        const quarterEndStr = quarterEnd.format('YYYY-MM-DD');

        return [
            {
                id: 'dateRange',
                label: 'Khoảng thời gian',
                type: 'dateRange' as const,
                options: [
                    {
                        value: today,
                        label: `Hôm nay (${dayjs(today).format('DD/MM/YYYY')})`,
                    },
                    {
                        value: `month:${monthStart}:${monthEnd}`,
                        label: `Tháng này (${dayjs(monthStart).format('DD/MM')} – ${dayjs(monthEnd).format('DD/MM/YYYY')})`,
                    },
                    {
                        value: `quarter:${quarterStartStr}:${quarterEndStr}`,
                        label: `Quý này (${quarterStart.format('DD/MM')} – ${quarterEnd.format('DD/MM/YYYY')})`,
                    },
                ],
            },
            {
                id: 'status',
                label: 'Trạng thái',
                options: REPORT_STATUS_OPTIONS,
            },
        ];
    }, []);

    return (
        <Toolbar className="admin-list-toolbar">
            <Box className="admin-list-toolbar__search">
                <Search
                    maxWidth="100%"
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={onSearchChange}
                />
            </Box>

            <Box className="admin-list-toolbar__actions">
                <JiraFilter
                    fields={filterFields}
                    selectedFilters={{
                        dateRange: buildDateRangeSelection(from, to),
                        status: status ? [status] : [],
                    }}
                    onFilterChange={onFilterChange}
                    onClearAll={onClearFilters}
                    trigger={({ onClick, totalFilterCount }) => (
                        <Button
                            variant="text"
                            size="small"
                            disableElevation
                            className="admin-list-action-button"
                            onClick={onClick}
                            startIcon={
                                <Badge badgeContent={totalFilterCount} color="primary" variant="dot">
                                    <SvgIcon viewBox="0 0 24 24">
                                        <g fill="none" fillRule="evenodd">
                                            <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                                            <path
                                                fill="currentColor"
                                                d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v2.086A2 2 0 0 1 20.414 8L15 13.414v7.424a1.1 1.1 0 0 1-1.592.984l-3.717-1.858A1.25 1.25 0 0 1 9 18.846v-5.432L3.586 8A2 2 0 0 1 3 6.586z"
                                            />
                                        </g>
                                    </SvgIcon>
                                </Badge>
                            }
                        >
                            Bộ lọc
                        </Button>
                    )}
                />
            </Box>
        </Toolbar>
    );
};
