"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Box, Button, SvgIcon, Toolbar } from '@mui/material';
import dayjs from 'dayjs';
import { Search } from '../../../../components/ui/Search';
import { Columns } from '../../../../components/ui/Columns';
import { SettingsList } from '../../../../components/ui/SettingsList';
import { JiraFilter, type IGridSettings, type Option } from '../../../../shared/data-grid';
import type { StreetAgentProfile } from '../../types/street-agent.type';
import { ALLOCATION_BATCH_STATUS_FILTER_OPTIONS } from './constants';
import {
    buildDateRangeSelection,
    normalizeDateRangeFilterValues,
    resolveReportDateRange,
} from '../sections/StreetAgentReportToolbar';
import { formatDate, parseDisplayDateToApi } from '../../utils/format';
import { useStreetAgentProfiles } from '../../hooks/useStreetAgent';

const PROFILE_PAGE_SIZE = 20;

export interface VendorAllocationBatchToolbarProps {
    settings: IGridSettings;
    onSettingsChange: React.Dispatch<React.SetStateAction<IGridSettings>>;
    search: string;
    onSearchChange: (value: string) => void;
    profile: StreetAgentProfile | null;
    onProfileChange: (profile: StreetAgentProfile | null) => void;
    getProfileLabel: (profile?: StreetAgentProfile | null) => string;
    status: string;
    onStatusChange: (status: string) => void;
    businessDateFrom: string;
    businessDateTo: string;
    onBusinessDateRangeChange: (range: { startDate: string; endDate: string }) => void;
    onClearFilters: () => void;
    /** Accumulate loaded profiles so the grid can resolve agent labels. */
    onProfilesLoaded?: (profiles: StreetAgentProfile[]) => void;
}

const FilterTrigger = ({
    onClick,
    totalFilterCount,
}: {
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    totalFilterCount: number;
}) => (
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
);

export const VendorAllocationBatchToolbar = ({
    settings,
    onSettingsChange,
    search,
    onSearchChange,
    profile = null,
    onProfileChange,
    getProfileLabel,
    status,
    onStatusChange,
    businessDateFrom,
    businessDateTo,
    onBusinessDateRangeChange,
    onClearFilters,
    onProfilesLoaded,
}: VendorAllocationBatchToolbarProps) => {
    const fromIso = parseDisplayDateToApi(businessDateFrom);
    const toIso = parseDisplayDateToApi(businessDateTo);

    const [profileSearch, setProfileSearch] = useState('');
    const [profilePage, setProfilePage] = useState(1);
    const [profileOptions, setProfileOptions] = useState<StreetAgentProfile[]>([]);

    const profilesQuery = useStreetAgentProfiles({
        page: profilePage,
        limit: PROFILE_PAGE_SIZE,
        search: profileSearch.trim() || undefined,
    });

    const totalPages = profilesQuery.data?.data?.pagination?.totalPages || 0;
    const isLoadingProfiles = profilesQuery.isFetching;

    useEffect(() => {
        if (!profilesQuery.isSuccess) return;
        const pageProfiles = profilesQuery.data?.data?.recordList || [];
        setProfileOptions((prev) => {
            const merged = profilePage === 1 ? pageProfiles : [...prev, ...pageProfiles];
            const byId = new Map<number, StreetAgentProfile>();
            merged.forEach((item) => byId.set(item.id, item));
            return Array.from(byId.values());
        });
        if (pageProfiles.length) {
            onProfilesLoaded?.(pageProfiles);
        }
    }, [onProfilesLoaded, profilePage, profilesQuery.data, profilesQuery.isSuccess]);

    const profileFilterOptions = useMemo<Option[]>(() => {
        const options = profileOptions.map((item) => ({
            value: String(item.id),
            label: getProfileLabel(item),
        }));
        if (profile && !options.some((opt) => opt.value === String(profile.id))) {
            return [{ value: String(profile.id), label: getProfileLabel(profile) }, ...options];
        }
        return options;
    }, [getProfileLabel, profile, profileOptions]);

    const filterFields = useMemo(() => {
        const today = dayjs().format('YYYY-MM-DD');
        const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
        const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');

        return [
            {
                id: 'profile',
                label: 'Người bán vé số',
                options: profileFilterOptions,
                asyncSearch: true,
                loading: isLoadingProfiles,
                hasMore: profilePage < totalPages,
            },
            {
                id: 'status',
                label: 'Trạng thái',
                options: ALLOCATION_BATCH_STATUS_FILTER_OPTIONS,
            },
            {
                id: 'dateRange',
                label: 'Ngày kinh doanh',
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
                ],
            },
        ];
    }, [isLoadingProfiles, profileFilterOptions, profilePage, totalPages]);

    const handleFieldSearch = useCallback((fieldId: string, query: string) => {
        if (fieldId !== 'profile') return;
        setProfileSearch(query);
        setProfilePage(1);
    }, []);

    const handleFieldLoadMore = useCallback((fieldId: string) => {
        if (fieldId !== 'profile') return;
        setProfilePage((current) => current + 1);
    }, []);

    const handleFilterChange = (fieldId: string, values: string[]) => {
        if (fieldId === 'profile') {
            const previous = profile ? [String(profile.id)] : [];
            const added = values.find((value) => !previous.includes(value));
            const nextId = added || values[0];
            if (!nextId) {
                onProfileChange(null);
                return;
            }
            const nextProfile =
                profileOptions.find((item) => String(item.id) === nextId)
                || (profile && String(profile.id) === nextId ? profile : null);
            onProfileChange(nextProfile);
            return;
        }

        if (fieldId === 'status') {
            const previous = status ? [status] : [];
            const added = values.find((value) => !previous.includes(value));
            onStatusChange(added || values[0] || '');
            return;
        }

        if (fieldId === 'dateRange') {
            const previous = fromIso && toIso ? buildDateRangeSelection(fromIso, toIso) : [];
            const normalized = normalizeDateRangeFilterValues(previous, values);
            if (!normalized.length) {
                onBusinessDateRangeChange({ startDate: '', endDate: '' });
                return;
            }
            const nextRange = resolveReportDateRange(normalized);
            if (!nextRange) {
                onBusinessDateRangeChange({ startDate: '', endDate: '' });
                return;
            }
            onBusinessDateRangeChange({
                startDate: formatDate(nextRange.from),
                endDate: formatDate(nextRange.to),
            });
        }
    };

    return (
        <Toolbar className="admin-list-toolbar">
            <Box className="admin-list-toolbar__search">
                <Search
                    maxWidth="100%"
                    placeholder="Tìm mã phiếu, người bán..."
                    value={search}
                    onChange={onSearchChange}
                />
            </Box>

            <Box className="admin-list-toolbar__actions">
                <JiraFilter
                    fields={filterFields}
                    selectedFilters={{
                        profile: profile ? [String(profile.id)] : [],
                        status: status ? [status] : [],
                        dateRange: fromIso && toIso ? buildDateRangeSelection(fromIso, toIso) : [],
                    }}
                    onFilterChange={handleFilterChange}
                    onClearAll={onClearFilters}
                    onFieldSearch={handleFieldSearch}
                    onFieldLoadMore={handleFieldLoadMore}
                    trigger={FilterTrigger}
                />
                <Columns />
                <SettingsList settings={settings} onSettingsChange={onSettingsChange} />
            </Box>
        </Toolbar>
    );
};
